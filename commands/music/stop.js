const { SlashCommandBuilder } = require('discord.js');
const { getAutoplaySettings } = require('../../mongodb.js');
const { cleanupTrackMessages } = require('../../player.js');
const { checkVoiceChannel, checkMusicChannel } = require('../../utils/voiceChannelCheck.js');
const { sendSuccessResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { getLang } = require('../../utils/languageLoader');

const data = new SlashCommandBuilder()
  .setName("stop")
  .setDescription("Stop the current song and destroy the player");

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
            const t = lang.music.stop;

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

            const settings = await getAutoplaySettings(interaction.guildId).catch(() => ({ twentyfourseven: true }));
            const is24_7 = settings.twentyfourseven;

            await cleanupTrackMessages(client, queue);

            if (is24_7) {
                // In 24/7 mode: clear upcoming songs then skip current
                queue.songs.splice(1);
                await client.distube.skip(queue.voiceChannel);
            } else {
                // Normal mode: stop playback and disconnect
                await client.distube.stop(queue.voiceChannel);
            }

            return await sendSuccessResponse(
                interaction,
                t.success.title + '\n\n' +
                (is24_7 ? t.success.message24_7 : t.success.messageNormal) + '\n' +
                t.success.note
            );

        } catch (error) {
            const lang = await getLang(interaction.guildId).catch(() => ({ music: { stop: { errors: {} } } }));
            const t = lang.music?.stop?.errors || {};

            return await handleCommandError(
                interaction,
                error,
                'stop',
                (t.title || '## ❌ Error') + '\n\n' + (t.message || 'An error occurred while stopping the music.\nPlease try again later.')
            );
        }
    }
};
