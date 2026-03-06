const { SlashCommandBuilder, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { checkVoiceChannel, checkMusicChannel } = require('../../utils/voiceChannelCheck.js');
const { checkCurrentTrack } = require('../../utils/playerValidation.js');
const { getEmbedColor, handleCommandError } = require('../../utils/responseHandler.js');
const { getLang } = require('../../utils/languageLoader');

const data = new SlashCommandBuilder()
  .setName("trackinfo")
  .setDescription("Show detailed information about the current track");

function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

    return [
        hours > 0 ? `${hours}h` : null,
        minutes > 0 ? `${minutes}m` : null,
        `${seconds}s`,
    ]
        .filter(Boolean)
        .join(' ');
}

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
            const t = lang.music.trackinfo;

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

            const trackCheck = await checkCurrentTrack(queue, null, interaction.guildId);

            if (!trackCheck.valid) {
                const reply = await interaction.editReply({
                    ...trackCheck.response,
                    fetchReply: true
                });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return reply;
            }

            const currentSong = queue.songs[0];
            // currentTime is in seconds; convert to ms for formatDuration
            const positionMs = queue.currentTime * 1000;
            // duration is in seconds; convert to ms for formatDuration
            const durationMs = currentSong.duration * 1000;
            const progress = Math.round((positionMs / durationMs) * 100);

            const embedColor = getEmbedColor();
            const components = [];

            const trackInfoContainer = new ContainerBuilder()
                .setAccentColor(embedColor)
                .addTextDisplayComponents(
                    (textDisplay) => textDisplay.setContent(
                        t.trackInfo.title + '\n\n' +
                        t.trackInfo.titleLabel
                            .replace('{title}', currentSong.name)
                            .replace('{uri}', currentSong.url) + '\n' +
                        t.trackInfo.artist.replace('{artist}', currentSong.uploader?.name || 'Unknown') + '\n' +
                        t.trackInfo.duration.replace('{duration}', formatDuration(durationMs)) + '\n' +
                        t.trackInfo.source.replace('{source}', currentSong.source || 'Unknown')
                    )
                );

            components.push(trackInfoContainer);
            components.push(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

            const progressContainer = new ContainerBuilder()
                .setAccentColor(embedColor)
                .addTextDisplayComponents(
                    (textDisplay) => textDisplay.setContent(
                        t.progress.title + '\n\n' +
                        t.progress.current.replace('{current}', formatDuration(positionMs)) + '\n' +
                        t.progress.total.replace('{total}', formatDuration(durationMs)) + '\n' +
                        t.progress.progress.replace('{progress}', progress)
                    )
                );

            components.push(progressContainer);
            components.push(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

            // repeatMode: 0=off, 1=song, 2=queue
            const loopText = queue.repeatMode === 0 ? 'Off' : queue.repeatMode === 1 ? 'Track' : 'Queue';
            const statusText = queue.paused ? '⏸️ Paused' : '▶️ Playing';
            const queueCount = queue.songs.length - 1;

            const statusContainer = new ContainerBuilder()
                .setAccentColor(embedColor)
                .addTextDisplayComponents(
                    (textDisplay) => textDisplay.setContent(
                        t.status.title + '\n\n' +
                        t.status.volume.replace('{volume}', queue.volume) + '\n' +
                        t.status.loop.replace('{loop}', loopText) + '\n' +
                        t.status.status.replace('{status}', statusText) + '\n' +
                        t.status.queue
                            .replace('{count}', queueCount)
                            .replace('{plural}', queueCount !== 1 ? 's' : '')
                    )
                );

            components.push(statusContainer);

            const reply = await interaction.editReply({
                components: components,
                flags: MessageFlags.IsComponentsV2,
                fetchReply: true
            });
            setTimeout(() => reply.delete().catch(() => {}), 3000);
            return reply;

        } catch (error) {
            const lang = await getLang(interaction.guildId).catch(() => ({ music: { trackinfo: { errors: {} } } }));
            const t = lang.music?.trackinfo?.errors || {};

            return await handleCommandError(
                interaction,
                error,
                'trackinfo',
                (t.title || '## ❌ Error') + '\n\n' + (t.message || 'An error occurred while retrieving track information.\nPlease try again later.')
            );
        }
    }
};
