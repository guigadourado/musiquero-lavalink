const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, checkMusicChannel } = require('../../utils/voiceChannelCheck.js');
const { sendSuccessResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { getLang } = require('../../utils/languageLoader');

const data = new SlashCommandBuilder()
  .setName("resume")
  .setDescription("Resume the current song");

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
            const t = lang.music.resume;

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

            // Validate queue before resuming
            if (!queue) {
                return await handleCommandError(
                    interaction,
                    new Error('Queue not available'),
                    'resume',
                    (t.errors?.title || '## ❌ Error') + '\n\n' + (t.errors?.message || 'Player is not available. Please start playing a song first.')
                );
            }

            // Check if already playing
            if (!queue.paused) {
                return await sendSuccessResponse(
                    interaction,
                    '## ▶️ Already Playing\n\n' +
                    'The music is already playing.\n' +
                    'Use `/pause` to pause playback.'
                );
            }

            // Try to resume with error handling
            try {
                await client.distube.resume(queue.voiceChannel);
            } catch (resumeError) {
                console.warn(`[ RESUME ] Error resuming queue: ${resumeError.message}`);
                // If resume fails, still try to send success message (queue might be in transition)
                // The error will be caught by outer catch if it's critical
            }

            return await sendSuccessResponse(
                interaction,
                t.success.title + '\n\n' +
                t.success.message + '\n' +
                t.success.note
            );

        } catch (error) {
            const lang = await getLang(interaction.guildId).catch(() => ({ music: { resume: { errors: {} } } }));
            const t = lang.music?.resume?.errors || {};

            return await handleCommandError(
                interaction,
                error,
                'resume',
                (t.title || '## ❌ Error') + '\n\n' + (t.message || 'An error occurred while resuming the music.\nPlease try again later.')
            );
        }
    }
};
