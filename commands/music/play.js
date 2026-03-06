const { SlashCommandBuilder, ContainerBuilder, MessageFlags } = require('discord.js');
const config = require('../../config.js');
const SpotifyWebApi = require('spotify-web-api-node');
const { getData } = require('spotify-url-info')(require('node-fetch'));
const { sendErrorResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { checkVoiceChannel: checkVC, checkMusicChannel } = require('../../utils/voiceChannelCheck.js');
const { getLang } = require('../../utils/languageLoader');

const data = new SlashCommandBuilder()
  .setName("play")
  .setDescription("Play a song from a name or link")
  .addStringOption(option =>
    option.setName("name")
      .setDescription("Enter song name / link or playlist")
      .setRequired(true)
  );

// Get Spotify credentials - supports multiple sets with fallback
function getSpotifyCredentials() {
    if (config.spotifyCredentials && Array.isArray(config.spotifyCredentials) && config.spotifyCredentials.length > 0) {
        return config.spotifyCredentials;
    }
    return [{
        clientId: config.spotifyClientId,
        clientSecret: config.spotifyClientSecret
    }];
}

function createSpotifyApi(credentials) {
    return new SpotifyWebApi({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
    });
}

let currentCredentialIndex = 0;

// Memory-efficient Spotify playlist fetcher
async function* getSpotifyPlaylistTracksGenerator(playlistId) {
    const credentials = getSpotifyCredentials();
    let lastError = null;

    for (let i = 0; i < credentials.length; i++) {
        try {
            const spotifyApi = createSpotifyApi(credentials[i]);
            const data = await spotifyApi.clientCredentialsGrant();
            spotifyApi.setAccessToken(data.body.access_token);

            let offset = 0;
            const limit = 50;
            let total = 0;
            let fetched = 0;
            const maxTracks = config.spotifyPlaylistLimit || 100;

            do {
                const response = await spotifyApi.getPlaylistTracks(playlistId, { limit, offset });
                if (total === 0) total = response.body.total;

                for (const item of response.body.items) {
                    if (item.track && item.track.name && item.track.artists) {
                        yield `${item.track.name} - ${item.track.artists.map(a => a.name).join(', ')}`;
                        fetched++;
                        if (fetched >= maxTracks) return;
                    }
                }

                offset += limit;
                if (offset < total && fetched < maxTracks) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } while (fetched < total && fetched < maxTracks);

            currentCredentialIndex = (i + 1) % credentials.length;
            return;
        } catch (error) {
            console.error(`Error fetching Spotify playlist with credential set ${i + 1}:`, error.message);
            lastError = error;
            continue;
        }
    }

    console.error("All Spotify credentials failed:", lastError);
}

module.exports = {
    data: data,
    run: async (client, interaction) => {
        try {
            const lang = await getLang(interaction.guildId);
            const t = lang.music.play;

            const query = interaction.options.getString('name');

            if (!query || typeof query !== 'string' || query.trim().length === 0) {
                return sendErrorResponse(
                    interaction,
                    t.noResults.title + '\n\n' +
                    t.noResults.message + '\n' +
                    t.noResults.note,
                    5000
                );
            }

            await interaction.deferReply();

            const musicChannelCheck = await checkMusicChannel(interaction);
            if (!musicChannelCheck.allowed) {
                const reply = await interaction.editReply(musicChannelCheck.response);
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return reply;
            }

            const existingQueue = client.distube.getQueue(interaction.guildId);
            const voiceCheck = await checkVC(interaction, existingQueue);
            if (!voiceCheck.allowed) {
                const reply = await interaction.editReply(voiceCheck.response);
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return reply;
            }

            const userVoiceChannel = interaction.member.voice.channel;
            if (!userVoiceChannel) {
                return sendErrorResponse(
                    interaction,
                    t.noResults.title + '\n\n' +
                    'You must be in a voice channel.\n' +
                    'Please join a voice channel and try again.',
                    5000
                );
            }

            const playOptions = {
                member: interaction.member,
                textChannel: interaction.channel,
            };

            let isPlaylist = false;
            let queuedTracks = 0;
            const prevQueueSize = existingQueue ? existingQueue.songs.length : 0;

            if (query.includes('spotify.com')) {
                try {
                    const spotifyData = await getData(query);

                    if (spotifyData.type === 'track') {
                        const trackName = `${spotifyData.name} - ${spotifyData.artists.map(a => a.name).join(', ')}`;
                        await client.distube.play(userVoiceChannel, trackName, playOptions);
                        queuedTracks = 1;
                    } else if (spotifyData.type === 'playlist') {
                        isPlaylist = true;
                        const playlistId = query.split('/playlist/')[1].split('?')[0];
                        const maxTracks = config.spotifyPlaylistLimit || 100;
                        let first = true;

                        for await (const trackQuery of getSpotifyPlaylistTracksGenerator(playlistId)) {
                            try {
                                await client.distube.play(userVoiceChannel, trackQuery, playOptions);
                                queuedTracks++;
                                if (queuedTracks >= maxTracks) break;
                                if (first) {
                                    await new Promise(r => setTimeout(r, 500));
                                    first = false;
                                }
                            } catch (err) {
                                console.error(`Error queueing Spotify track "${trackQuery}":`, err.message);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error fetching Spotify data:', err);
                    return sendErrorResponse(
                        interaction,
                        t.spotifyError.title + '\n\n' +
                        t.spotifyError.message + '\n' +
                        t.spotifyError.note,
                        5000
                    );
                }
            } else {
                const trimmedQuery = query.trim();
                if (!trimmedQuery || trimmedQuery.length < 2) {
                    return sendErrorResponse(
                        interaction,
                        t.noResults.title + '\n\n' +
                        t.noResults.message + '\n' +
                        t.noResults.note,
                        5000
                    );
                }

                try {
                    await client.distube.play(userVoiceChannel, trimmedQuery, playOptions);
                    const newQueue = client.distube.getQueue(interaction.guildId);
                    const newSize = newQueue ? newQueue.songs.length : 0;
                    queuedTracks = Math.max(1, newSize - prevQueueSize);
                    if (queuedTracks > 1) isPlaylist = true;
                } catch (err) {
                    console.error(`[ PLAY ] Error playing "${trimmedQuery}":`, err.message);
                    return sendErrorResponse(
                        interaction,
                        t.noResults.title + '\n\n' +
                        t.noResults.message + '\n' +
                        t.noResults.note,
                        5000
                    );
                }
            }

            if (queuedTracks === 0) {
                return sendErrorResponse(
                    interaction,
                    t.noResults.title + '\n\n' +
                    t.noResults.message + '\n' +
                    t.noResults.note,
                    5000
                );
            }

            const embedColor = parseInt(config.embedColor?.replace('#', '') || '1db954', 16);
            const currentQueue = client.distube.getQueue(interaction.guildId);
            const isPlaying = currentQueue && !currentQueue.paused;

            const successMessage =
                (isPlaylist ? t.success.titlePlaylist : t.success.titleTrack) + '\n\n' +
                (isPlaylist
                    ? t.success.playlistAdded.replace('{count}', queuedTracks)
                    : t.success.trackAdded) + '\n\n' +
                (isPlaying ? t.success.nowPlaying : t.success.queueReady);

            const successContainer = new ContainerBuilder()
                .setAccentColor(embedColor)
                .addTextDisplayComponents(
                    (textDisplay) => textDisplay.setContent(successMessage)
                );

            const message = await interaction.editReply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2,
                fetchReply: true
            });

            setTimeout(() => {
                message.delete().catch(() => {});
            }, 3000);

        } catch (error) {
            const lang = await getLang(interaction.guildId).catch(() => ({ music: { play: { errors: {} } } }));
            const t = lang.music?.play || {};

            return handleCommandError(
                interaction,
                error,
                'play',
                (t.errors?.title || '## ❌ Error') + '\n\n' + (t.errors?.message || 'An error occurred while processing the request.\nPlease try again later.')
            );
        }
    },
};
