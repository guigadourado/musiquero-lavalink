const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, checkMusicChannel } = require('../../utils/voiceChannelCheck.js');
const { checkQueue } = require('../../utils/playerValidation.js');
const { sendErrorResponse, sendSuccessResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { getLang } = require('../../utils/languageLoader');

const data = new SlashCommandBuilder()
  .setName("remove")
  .setDescription("Remove a song from the queue by its position")
  .addIntegerOption(option =>
    option.setName("position")
      .setDescription("Position of the song to remove from the queue")
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
            const t = lang.music.remove;

            const position = interaction.options.getInteger('position');
            const queue = client.distube.getQueue(interaction.guildId);
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

            // upcoming songs are queue.songs.slice(1); position is 1-based within upcoming
            const upcomingCount = queue.songs.length - 1;

            if (position < 1 || position > upcomingCount) {
                return await sendErrorResponse(
                    interaction,
                    t.invalidPosition.title + '\n\n' +
                    t.invalidPosition.message.replace('{max}', upcomingCount) + '\n' +
                    t.invalidPosition.note
                        .replace('{count}', upcomingCount)
                        .replace('{plural}', upcomingCount > 1 ? 's' : '')
                );
            }

            // songs[0] = current, songs[position] = queue item at 1-based position
            const removedTrack = queue.songs[position];
            queue.songs.splice(position, 1);

            return await sendSuccessResponse(
                interaction,
                t.success.title + '\n\n' +
                t.success.removed
                    .replace('{title}', removedTrack.name)
                    .replace('{uri}', removedTrack.url) + '\n' +
                t.success.position.replace('{position}', position) + '\n\n' +
                t.success.message
            );

        } catch (error) {
            const lang = await getLang(interaction.guildId).catch(() => ({ music: { remove: { errors: {} } } }));
            const t = lang.music?.remove?.errors || {};

            return await handleCommandError(
                interaction,
                error,
                'remove',
                (t.title || '## ❌ Error') + '\n\n' + (t.message || 'An error occurred while removing the song.\nPlease try again later.')
            );
        }
    }
};
