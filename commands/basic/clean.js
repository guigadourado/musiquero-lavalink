const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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

      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return sendErrorResponse(
          interaction,
          t.noPermission.title + '\n\n' + t.noPermission.message,
          5000
        );
      }

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

      const nowPlaying = nowPlayingMessages.get(guildId);
      const nowPlayingMessageId = nowPlaying && nowPlaying.channelId === channel.id ? nowPlaying.messageId : null;

      let totalDeleted = 0;
      let lastMessageId = null;
      const maxAge = 14 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      while (true) {
        const options = { limit: 100 };
        if (lastMessageId) options.before = lastMessageId;

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        const messagesToDelete = messages.filter(msg => {
          if (now - msg.createdTimestamp > maxAge) return false;
          if (nowPlayingMessageId && msg.id === nowPlayingMessageId) return false;
          return true;
        });

        if (messagesToDelete.size === 0) {
          lastMessageId = messages.last()?.id;
          if (!lastMessageId) break;
          continue;
        }

        const batches = [];
        const arr = Array.from(messagesToDelete.values());
        for (let i = 0; i < arr.length; i += 100) batches.push(arr.slice(i, i + 100));

        for (const batch of batches) {
          try {
            if (batch.length > 1) {
              await channel.bulkDelete(batch, true);
              totalDeleted += batch.length;
            } else {
              await batch[0].delete();
              totalDeleted++;
            }
          } catch (err) {
            if (err.code === 50034) {
              for (const msg of batch) {
                try { await msg.delete(); totalDeleted++; } catch (e) {
                  if (!e.message?.includes('Unknown Message')) console.error('Error deleting message:', e);
                }
              }
            } else {
              console.error('Error in bulk delete:', err);
            }
          }
        }

        lastMessageId = messages.last()?.id;
        if (!lastMessageId || messages.size < 100) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      try { await interaction.deleteReply(); } catch (_) {}

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
