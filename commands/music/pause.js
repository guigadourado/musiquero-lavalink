const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, checkMusicChannel } = require('../../utils/voiceChannelCheck.js');
const { sendSuccessResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { getLang } = require('../../utils/languageLoader');

const data = new SlashCommandBuilder()
  .setName("pause")
  .setDescription("Pause the current song");

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
            const t = lang.music.pause;

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

            // Validate queue before pausing
            if (!queue) {
                return await handleCommandError(
                    interaction,
                    new Error('Queue not available'),
                    'pause',
                    (t.errors?.title || '## ❌ Error') + '\n\n' + (t.errors?.message || 'Player is not available. Please start playing a song first.')
                );
            }

            // Check if already paused
            if (queue.paused) {
                return await sendSuccessResponse(
                    interaction,
                    '## ⏸️ Already Paused\n\n' +
                    'The music is already paused.\n' +
                    'Use `/resume` to continue playback.'
                );
            }

            // Try to pause with error handling
            try {
                await client.distube.pause(queue.voiceChannel);
            } catch (pauseError) {
                console.warn(`[ PAUSE ] Error pausing queue: ${pauseError.message}`);
            }

            return await sendSuccessResponse(
                interaction,
                t.success.title + '\n\n' +
                t.success.message + '\n' +
                t.success.note
            );

        } catch (error) {
            const lang = await getLang(interaction.guildId).catch(() => ({ music: { pause: { errors: {} } } }));
            const t = lang.music?.pause?.errors || {};

            return await handleCommandError(
                interaction,
                error,
                'pause',
                (t.title || '## ❌ Error') + '\n\n' + (t.message || 'An error occurred while pausing the music.\nPlease try again later.')
            );
        }
    }
};
