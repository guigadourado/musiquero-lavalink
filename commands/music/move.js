const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, checkMusicChannel } = require('../../utils/voiceChannelCheck.js');
const { checkQueue } = require('../../utils/playerValidation.js');
const { sendErrorResponse, sendSuccessResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { getLang } = require('../../utils/languageLoader');

const data = new SlashCommandBuilder()
  .setName("move")
  .setDescription("Move a track to a different position in the queue")
  .addIntegerOption(option =>
    option.setName("from")
      .setDescription("Current position of the track (1-based)")
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option.setName("to")
      .setDescription("New position for the track (1-based)")
      .setRequired(true)
  );

module.exports = {
    data: data,
    run: async (client, interaction) => {
        try {
            await interaction.deferReply();

            // Check if command is in the allowed music channel
            const musicChannelCheck = await checkMusicChannel(interaction);
            if (!musicChannelCheck.allowed) {
                const reply = await interaction.editReply(musicChannelCheck.response);
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return reply;
            }

            const lang = await getLang(interaction.guildId);
            const t = lang.music.move;

            const queue = client.distube.getQueue(interaction.guildId);
            const from = interaction.options.getInteger('from');
            const to = interaction.options.getInteger('to');
            const check = await checkVoiceChannel(interaction, queue);

            if (!check.allowed) {
                const reply = await interaction.editReply({
                    ...check.response,
                    fetchReply: true
                });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return reply;
            }

            const queueCheck = await checkQueue(queue,
                t.queueEmpty.title + '\n\n' +
                t.queueEmpty.message + '\n' +
                t.queueEmpty.note,
                interaction.guildId
            );

            if (!queueCheck.valid) {
                const reply = await interaction.editReply({
                    ...queueCheck.response,
                    fetchReply: true
                });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return reply;
            }

            // upcoming count = total songs minus current (songs[0])
            const upcomingCount = queue.songs.length - 1;

            if (from < 1 || from > upcomingCount || to < 1 || to > upcomingCount) {
                return await sendErrorResponse(
                    interaction,
                    t.invalidPosition.title + '\n\n' +
                    t.invalidPosition.message.replace('{max}', upcomingCount) + '\n' +
                    t.invalidPosition.note
                        .replace('{count}', upcomingCount)
                        .replace('{plural}', upcomingCount > 1 ? 's' : '')
                );
            }

            if (from === to) {
                return await sendErrorResponse(
                    interaction,
                    t.samePosition.title + '\n\n' +
                    t.samePosition.message + '\n' +
                    t.samePosition.note
                );
            }

            // Work with upcoming array (offset: songs[0]=current, songs[1]=upcoming[0])
            const upcoming = queue.songs.slice(1);
            const track = upcoming[from - 1];

            upcoming.splice(from - 1, 1);
            upcoming.splice(to - 1, 0, track);

            // Replace upcoming songs in queue (keep songs[0] as current)
            queue.songs.splice(1, queue.songs.length - 1, ...upcoming);

            return await sendSuccessResponse(
                interaction,
                t.success.title + '\n\n' +
                t.success.track
                    .replace('{title}', track.name)
                    .replace('{uri}', track.url) + '\n' +
                t.success.from.replace('{from}', from) + '\n' +
                t.success.to.replace('{to}', to) + '\n\n' +
                t.success.message
            );

        } catch (error) {
            const lang = await getLang(interaction.guildId).catch(() => ({ music: { move: { errors: {} } } }));
            const t = lang.music?.move?.errors || {};

            return await handleCommandError(
                interaction,
                error,
                'move',
                (t.title || '## ❌ Error') + '\n\n' + (t.message || 'An error occurred while moving the track.\nPlease try again later.')
            );
        }
    }
};
