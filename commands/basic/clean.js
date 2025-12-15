const { SlashCommandBuilder, ContainerBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');
const { getLang } = require('../../utils/languageLoader');
const { sendErrorResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { nowPlayingMessages } = require('../../player.js');

const data = new SlashCommandBuilder()
  .setName("clean")
  .setDescription("Clean all messages from the channel, keeping only the current playing track info");

module.exports = {
  data: data,
  run: async (client, interaction) => {
    try {
      const lang = await getLang(interaction.guildId);
      const t = lang.clean;

      // Check if user has permission to manage messages
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return sendErrorResponse(
          interaction,
          t.noPermission.title + '\n\n' + t.noPermission.message,
          5000
        );
      }

      // Check if bot has permission to manage messages
      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return sendErrorResponse(
          interaction,
          t.botNoPermission.title + '\n\n' + t.botNoPermission.message,
          5000
        );
      }

      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.channel;
      const guildId = interaction.guildId;
      
      // Get the current "now playing" message ID if it exists
      const nowPlaying = nowPlayingMessages.get(guildId);
      const nowPlayingMessageId = nowPlaying && nowPlaying.channelId === channel.id ? nowPlaying.messageId : null;
      
      let totalDeleted = 0;
      let lastMessageId = null;
      const maxAge = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
      const now = Date.now();

      // Fetch and delete messages in batches
      while (true) {
        const options = { limit: 100 };
        if (lastMessageId) {
          options.before = lastMessageId;
        }

        const messages = await channel.messages.fetch(options);
        
        if (messages.size === 0) break;

        // Filter messages to delete: ALL messages except the now playing message
        const messagesToDelete = messages.filter(msg => {
          // Only delete messages less than 14 days old (Discord bulk delete limit)
          const messageAge = now - msg.createdTimestamp;
          if (messageAge > maxAge) return false;
          
          // Don't delete the now playing message
          if (nowPlayingMessageId && msg.id === nowPlayingMessageId) return false;
          
          // Delete ALL other messages (bot messages, user messages, interactions, etc.)
          return true;
        });

        if (messagesToDelete.size === 0) {
          // No more messages to delete, but continue to check older messages
          lastMessageId = messages.last()?.id;
          if (!lastMessageId) break;
          continue;
        }

        // Delete messages in batches (Discord allows up to 100 at once)
        const messagesArray = Array.from(messagesToDelete.values());
        const batches = [];
        
        for (let i = 0; i < messagesArray.length; i += 100) {
          batches.push(messagesArray.slice(i, i + 100));
        }

        for (const batch of batches) {
          try {
            // Use bulk delete if all messages are less than 14 days old
            const recentMessages = batch.filter(msg => {
              const age = now - msg.createdTimestamp;
              return age <= maxAge;
            });

            if (recentMessages.length === batch.length && recentMessages.length > 1) {
              // Bulk delete (faster)
              await channel.bulkDelete(recentMessages, true);
              totalDeleted += recentMessages.length;
            } else {
              // Individual delete (for older messages or single messages)
              for (const msg of batch) {
                try {
                  await msg.delete();
                  totalDeleted++;
                } catch (err) {
                  // Ignore errors for individual messages (might be already deleted)
                  if (!err.message.includes('Unknown Message')) {
                    console.error('Error deleting message:', err);
                  }
                }
              }
            }
          } catch (err) {
            // If bulk delete fails, try individual deletes
            if (err.code === 50034) {
              // "You can only bulk delete messages that are under 14 days old"
              for (const msg of batch) {
                try {
                  const age = now - msg.createdTimestamp;
                  if (age <= maxAge) {
                    await msg.delete();
                    totalDeleted++;
                  }
                } catch (deleteErr) {
                  if (!deleteErr.message.includes('Unknown Message')) {
                    console.error('Error deleting message:', deleteErr);
                  }
                }
              }
            } else {
              console.error('Error in bulk delete:', err);
            }
          }
        }

        // Update lastMessageId for next iteration
        lastMessageId = messages.last()?.id;
        if (!lastMessageId || messages.size < 100) break;

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const embedColor = parseInt(config.embedColor?.replace('#', '') || '1db954', 16);
      const successContainer = new ContainerBuilder()
        .setAccentColor(embedColor)
        .addTextDisplayComponents(
          (textDisplay) => textDisplay.setContent(
            t.success.title + '\n\n' +
            t.success.message.replace('{count}', totalDeleted) + '\n' +
            t.success.note
          )
        );

      return interaction.editReply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
      });

    } catch (error) {
      const lang = await getLang(interaction.guildId).catch(() => ({ clean: { errors: {} } }));
      const t = lang.clean?.errors || {};
      
      return handleCommandError(
        interaction,
        error,
        'clean',
        (t.title || '## ❌ Error') + '\n\n' + (t.message || 'An error occurred while cleaning messages.\nPlease try again later.')
      );
    }
  },
};

