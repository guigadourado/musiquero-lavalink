const { SlashCommandBuilder } = require('discord.js');
const { cleanupTrackMessages } = require('../../player.js');
const { checkVoiceChannel, checkMusicChannel } = require('../../utils/voiceChannelCheck.js');
const { checkQueue } = require('../../utils/playerValidation.js');
const { sendErrorResponse, sendSuccessResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { getLang } = require('../../utils/languageLoader');

const data = new SlashCommandBuilder()
  .setName("jump")
  .setDescription("Jump to a specific track in the queue")
  .addIntegerOption(option =>
    option.setName("position")
      .setDescription("Position of the track in queue (1-based)")
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
            const t = lang.music.jump;

            const queue = client.distube.getQueue(interaction.guildId);
            const position = interaction.options.getInteger('position');
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

            // upcoming songs are queue.songs.slice(1)
            const upcoming = queue.songs.slice(1);
            const upcomingCount = upcoming.length;

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

            // upcoming[position-1] is the target track
            const track = upcoming[position - 1];

            // Remove all songs between current (index 0) and target (songs[position])
            // so the target becomes songs[1] (next to play), then skip current
            queue.songs.splice(1, position - 1);

            await cleanupTrackMessages(client, queue);

            await client.distube.skip(queue.voiceChannel);

            return await sendSuccessResponse(
                interaction,
                t.success.title + '\n\n' +
                t.success.track
                    .replace('{title}', track.name)
                    .replace('{uri}', track.url) + '\n' +
                t.success.position.replace('{position}', position) + '\n\n' +
                t.success.message
            );

        } catch (error) {
            const lang = await getLang(interaction.guildId).catch(() => ({ music: { jump: { errors: {} } } }));
            const t = lang.music?.jump?.errors || {};

            return await handleCommandError(
                interaction,
                error,
                'jump',
                (t.title || '## ❌ Error') + '\n\n' + (t.message || 'An error occurred while jumping to the track.\nPlease try again later.')
            );
        }
    }
};
