const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, checkMusicChannel } = require('../../utils/voiceChannelCheck.js');
const { checkQueue } = require('../../utils/playerValidation.js');
const { sendSuccessResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { getLang } = require('../../utils/languageLoader');

const data = new SlashCommandBuilder()
  .setName("shuffle")
  .setDescription("Shuffle the current song queue");

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
            const t = lang.music.shuffle;

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

            await client.distube.shuffle(queue.voiceChannel);

            // upcoming count = total songs minus current
            const upcomingCount = queue.songs.length - 1;

            return await sendSuccessResponse(
                interaction,
                t.success.title + '\n\n' +
                t.success.message + '\n\n' +
                t.success.count
                    .replace('{count}', upcomingCount)
                    .replace('{plural}', upcomingCount > 1 ? 's' : '')
            );

        } catch (error) {
            const lang = await getLang(interaction.guildId).catch(() => ({ music: { shuffle: { errors: {} } } }));
            const t = lang.music?.shuffle?.errors || {};

            return await handleCommandError(
                interaction,
                error,
                'shuffle',
                (t.title || '## ❌ Error') + '\n\n' + (t.message || 'An error occurred while shuffling the queue.\nPlease try again later.')
            );
        }
    }
};
