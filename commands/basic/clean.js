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

      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.channel;
      const guildId = interaction.guildId;

      if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
        return sendErrorResponse(
          interaction,
          t.botNoPermission.title + '\n\n' + t.botNoPermission.message,
          5000
        );
      }

      const nowPlaying = nowPlayingMessages.get(guildId);
      const nowPlayingMessageId = nowPlaying && nowPlaying.channelId === channel.id ? nowPlaying.messageId : null;

      let totalDeleted = 0;
      let lastMessageId = null;
      const bulkDeleteCutoff = 14 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      while (true) {
        const options = { limit: 100 };
        if (lastMessageId) options.before = lastMessageId;

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        const messagesToDelete = messages.filter(msg => {
          if (nowPlayingMessageId && msg.id === nowPlayingMessageId) return false;
          return true;
        });

        if (messagesToDelete.size === 0) {
          lastMessageId = messages.last()?.id;
          if (!lastMessageId) break;
          continue;
        }

        const recent = messagesToDelete.filter(msg => now - msg.createdTimestamp <= bulkDeleteCutoff);
        const old = messagesToDelete.filter(msg => now - msg.createdTimestamp > bulkDeleteCutoff);

        // Bulk delete messages younger than 14 days
        const recentArr = Array.from(recent.values());
        for (let i = 0; i < recentArr.length; i += 100) {
          const batch = recentArr.slice(i, i + 100);
          try {
            if (batch.length > 1) {
              await channel.bulkDelete(batch, true);
              totalDeleted += batch.length;
            } else {
              await batch[0].delete();
              totalDeleted++;
            }
          } catch (err) {
            // Fall back to individual deletes if bulk fails
            for (const msg of batch) {
              try { await msg.delete(); totalDeleted++; } catch (e) {
                if (!e.message?.includes('Unknown Message')) console.error('Error deleting message:', e);
              }
            }
          }
        }

        // Delete messages older than 14 days in parallel batches of 10
        const oldArr = Array.from(old.values());
        for (let i = 0; i < oldArr.length; i += 10) {
          const chunk = oldArr.slice(i, i + 10);
          const results = await Promise.allSettled(chunk.map(msg => msg.delete()));
          results.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
              totalDeleted++;
            } else if (!result.reason?.message?.includes('Unknown Message')) {
              console.error('Error deleting old message:', result.reason);
            }
          });
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
