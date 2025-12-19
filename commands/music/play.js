const { SlashCommandBuilder, ContainerBuilder, MessageFlags } = require('discord.js');
const config = require('../../config.js');
const SpotifyWebApi = require('spotify-web-api-node');
const { getData } = require('spotify-url-info')(require('node-fetch'));
const { sendErrorResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { checkVoiceChannel: checkVC, checkMusicChannel } = require('../../utils/voiceChannelCheck.js');
const { getLavalinkManager } = require('../../lavalink.js');
const { getLang } = require('../../utils/languageLoader');
const requesters = new Map();

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
    // Fallback to legacy single credentials
    return [{
    clientId: config.spotifyClientId, 
        clientSecret: config.spotifyClientSecret
    }];
}

// Create Spotify API instance with credentials
function createSpotifyApi(credentials) {
    return new SpotifyWebApi({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
});
}

// Get Spotify API with automatic credential rotation/fallback
let currentCredentialIndex = 0;
function getSpotifyApi() {
    const credentials = getSpotifyCredentials();
    return createSpotifyApi(credentials[currentCredentialIndex % credentials.length]);
}

// Memory-efficient Spotify playlist fetcher - returns generator function
async function* getSpotifyPlaylistTracksGenerator(playlistId) {
    const credentials = getSpotifyCredentials();
    let lastError = null;

    // Try each credential set until one works
    for (let i = 0; i < credentials.length; i++) {
        try {
            const spotifyApi = createSpotifyApi(credentials[i]);
            const data = await spotifyApi.clientCredentialsGrant();
            spotifyApi.setAccessToken(data.body.access_token);

            let offset = 0;
            let limit = 50; // Reduced from 100 to process in smaller batches
            let total = 0;
            let fetched = 0;
            const maxTracks = config.spotifyPlaylistLimit || 100; // Limit total tracks for memory efficiency

            do {
                const response = await spotifyApi.getPlaylistTracks(playlistId, { limit, offset });
                if (total === 0) total = response.body.total;
                
                // Process items one at a time to save memory
                for (const item of response.body.items) {
                    if (item.track && item.track.name && item.track.artists) {
                        const trackName = `${item.track.name} - ${item.track.artists.map(a => a.name).join(', ')}`;
                        yield trackName; // Yield track immediately instead of storing in array
                        fetched++;
                        
                        // Stop if we've reached the limit
                        if (fetched >= maxTracks) {
                            return;
                        }
                    }
                }
                
                offset += limit;
                
                // Small delay to avoid rate limits and reduce memory pressure
                if (offset < total && fetched < maxTracks) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } while (fetched < total && fetched < maxTracks);

            // Rotate to next credential for next request
            currentCredentialIndex = (i + 1) % credentials.length;
            return;
        } catch (error) {
            console.error(`Error fetching Spotify playlist tracks with credential set ${i + 1}:`, error.message);
            lastError = error;
            // Try next credential set
            continue;
        }
    }

    // All credentials failed
    console.error("All Spotify credentials failed:", lastError);
}

// Legacy function for backward compatibility - but now processes in batches
async function getSpotifyPlaylistTracks(playlistId) {
    const tracks = [];
    const maxTracks = config.spotifyPlaylistLimit || 100;
    
    try {
        for await (const track of getSpotifyPlaylistTracksGenerator(playlistId)) {
            tracks.push(track);
            if (tracks.length >= maxTracks) break;
        }
    } catch (error) {
        console.error('Error in Spotify playlist generator:', error);
    }
    
    return tracks;
}

module.exports = {
    data: data,
    run: async (client, interaction) => {
        try {
            const lang = await getLang(interaction.guildId);
            const t = lang.music.play;

            const query = interaction.options.getString('name');

            await interaction.deferReply();

            // Check if command is in the allowed music channel
            const musicChannelCheck = await checkMusicChannel(interaction);
            if (!musicChannelCheck.allowed) {
                const reply = await interaction.editReply(musicChannelCheck.response);
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return reply;
            }

            const existingPlayer = client.riffy.players.get(interaction.guildId);
            const voiceCheck = await checkVC(interaction, existingPlayer);
            if (!voiceCheck.allowed) {
                const reply = await interaction.editReply(voiceCheck.response);
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return reply;
            }

            const nodeManager = getLavalinkManager();
            if (!nodeManager) {
                return sendErrorResponse(
                    interaction,
                    t.lavalinkManagerError.title + '\n\n' +
                    t.lavalinkManagerError.message + '\n' +
                    t.lavalinkManagerError.note,
                    5000
                );
            }
            
            try {
                await nodeManager.ensureNodeAvailable();
            } catch (error) {
                const nodeCount = nodeManager.getNodeCount();
                const totalCount = nodeManager.getTotalNodeCount();
                return sendErrorResponse(
                    interaction,
                    t.noNodes.title + '\n\n' +
                    t.noNodes.message
                        .replace('{connected}', nodeCount)
                        .replace('{total}', totalCount) + '\n' +
                    t.noNodes.note,
                    5000
                );
            }

            const userVoiceChannel = interaction.member.voice.channelId;
            
            if (existingPlayer && existingPlayer.voiceChannel !== userVoiceChannel) {
                try {
                    const { cleanupTrackMessages } = require('../../player.js');
                    await cleanupTrackMessages(client, existingPlayer);
                    existingPlayer.queue.clear();
                    existingPlayer.stop();
                    await new Promise(resolve => setTimeout(resolve, 300));
                    existingPlayer.destroy();
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    console.error('Error destroying old player:', error);
                    try {
                        if (!existingPlayer.destroyed) {
                            existingPlayer.destroy();
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    } catch (e) {}
                }
            }

            await nodeManager.checkAllNodesHealth().catch(() => {});
            await nodeManager.forceConnectAllNodes().catch(() => {});
            await new Promise(res => setTimeout(res, 400));
            let player;
            let attempts = 0;
            const maxAttempts = 3;
            while (attempts < maxAttempts) {
                await nodeManager.ensureNodeAvailable();
                try {
                    player = client.riffy.createConnection({
                        guildId: interaction.guildId,
                        voiceChannel: userVoiceChannel,
                        textChannel: interaction.channelId,
                        deaf: true
                    });
                    break;
                } catch (err) {
                    attempts++;
                    const msg = err?.message || '';
                    if (attempts < maxAttempts && (msg.includes('No nodes are available') || msg.includes('fetch failed'))) {
                        await nodeManager.reconnectNodesNow?.(5000).catch(() => {});
                        await nodeManager.ensureNodeAvailable();
                        await new Promise(res => setTimeout(res, 700));
                        continue;
                    }
                    if (attempts >= maxAttempts) {
                        await nodeManager.refreshRiffy?.();
                        await nodeManager.ensureNodeAvailable();
                        player = client.riffy.createConnection({
                            guildId: interaction.guildId,
                            voiceChannel: userVoiceChannel,
                            textChannel: interaction.channelId,
                            deaf: true
                        });
                        break;
                    }
                    throw err;
                }
            }

            let tracksToQueue = [];
            let isPlaylist = false;

            if (query.includes('spotify.com')) {
                try {
                    const spotifyData = await getData(query);

                    if (spotifyData.type === 'track') {
                        const trackName = `${spotifyData.name} - ${spotifyData.artists.map(a => a.name).join(', ')}`;
                        tracksToQueue.push(trackName);
                    } else if (spotifyData.type === 'playlist') {
                        isPlaylist = true;
                        const playlistId = query.split('/playlist/')[1].split('?')[0]; 
                        // Process playlist in streaming fashion to save memory
                        tracksToQueue = await getSpotifyPlaylistTracks(playlistId);
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
                let resolve;
                try {
                    resolve = await client.riffy.resolve({ query, requester: interaction.user.username });
                } catch (err) {
                    const msg = err?.message || '';
                    if (msg.includes('fetch failed') || msg.includes('No nodes are available') || (err.cause && err.cause.code === 'ECONNREFUSED')) {
                        await nodeManager.reconnectNodesNow?.(5000).catch(() => {});
                        await nodeManager.ensureNodeAvailable();
                        resolve = await client.riffy.resolve({ query, requester: interaction.user.username });
                    } else {
                        throw err;
                    }
                }

                if (!resolve || typeof resolve !== 'object' || !Array.isArray(resolve.tracks)) {
                    return sendErrorResponse(
                        interaction,
                        t.invalidResponse.title + '\n\n' +
                        t.invalidResponse.message + '\n' +
                        t.invalidResponse.note,
                        5000
                    );
                }

                if (resolve.loadType === 'playlist') {
                    isPlaylist = true;
                    for (const track of resolve.tracks) {
                        track.info.requester = interaction.user.username;
                        player.queue.add(track);
                        requesters.set(track.info.uri, interaction.user.username);
                    }
                    // Shuffle playlist tracks after adding them
                    if (player.queue.length > 1) {
                        // Fisher-Yates shuffle algorithm
                        for (let i = player.queue.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [player.queue[i], player.queue[j]] = [player.queue[j], player.queue[i]];
                        }
                    }
                } else if (resolve.loadType === 'search' || resolve.loadType === 'track') {
                    const track = resolve.tracks.shift();
                    track.info.requester = interaction.user.username;
                    player.queue.add(track);
                    requesters.set(track.info.uri, interaction.user.username);
                } else {
                    return sendErrorResponse(
                        interaction,
                        t.noResults.title + '\n\n' +
                        t.noResults.message + '\n' +
                        t.noResults.note,
                        5000
                    );
                }
            }

            let queuedTracks = 0;
            const maxTracks = config.spotifyPlaylistLimit || 100; // Reduced from 200 for memory efficiency
            const batchSize = 5; // Process tracks in small batches to reduce memory pressure
            const delayBetweenBatches = 200; // Small delay between batches

            // Process tracks in batches for memory efficiency
            for (let i = 0; i < Math.min(tracksToQueue.length, maxTracks); i += batchSize) {
                const batch = tracksToQueue.slice(i, i + batchSize);
                
                // Process batch in parallel but limit concurrency
                const batchPromises = batch.map(async (trackQuery) => {
                    try {
                        const resolve = await client.riffy.resolve({ query: trackQuery, requester: interaction.user.username });
                        if (resolve && resolve.tracks && resolve.tracks.length > 0) {
                            const trackInfo = resolve.tracks[0];
                            player.queue.add(trackInfo);
                            requesters.set(trackInfo.info.uri, interaction.user.username);
                            return true;
                        }
                        return false;
                    } catch (error) {
                        console.error(`Error resolving track ${trackQuery}:`, error.message);
                        return false;
                    }
                });
                
                const results = await Promise.all(batchPromises);
                queuedTracks += results.filter(r => r === true).length;
                
                // Small delay between batches to reduce memory pressure and rate limits
                if (i + batchSize < Math.min(tracksToQueue.length, maxTracks)) {
                    await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
                }
            }
            
            // Notify user if playlist was truncated
            // Log truncation warning if needed
            if (tracksToQueue.length > maxTracks && isPlaylist) {
                console.warn(`[ SPOTIFY ] Playlist truncated: ${tracksToQueue.length} tracks requested, only ${maxTracks} queued (memory optimization)`);
            }

            // Shuffle playlist tracks after adding them
            if (isPlaylist && player.queue.length > 1) {
                // Fisher-Yates shuffle algorithm
                for (let i = player.queue.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [player.queue[i], player.queue[j]] = [player.queue[j], player.queue[i]];
                }
            }

            let connectionAttempts = 0;
            while (!player.connected && connectionAttempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 100));
                connectionAttempts++;
            }

            if (!player.playing && !player.paused) player.play();

            const embedColor = parseInt(config.embedColor?.replace('#', '') || '1db954', 16);
            let successMessage = (isPlaylist ? t.success.titlePlaylist : t.success.titleTrack) + '\n\n' +
                (isPlaylist 
                    ? t.success.playlistAdded.replace('{count}', queuedTracks)
                    : t.success.trackAdded) + '\n\n';
            
            // Add truncation notice if playlist was limited
            if (isPlaylist && tracksToQueue.length > maxTracks) {
                successMessage += `⚠️ Playlist limited to ${maxTracks} tracks for memory efficiency.\n\n`;
            }
            
            successMessage += (player.playing ? t.success.nowPlaying : t.success.queueReady);
            
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
            const t = lang.music?.play?.errors || {};
            
            return handleCommandError(
                interaction,
                error,
                'play',
                (t.title || '## ❌ Error') + '\n\n' + (t.message || 'An error occurred while processing the request.\nPlease try again later.')
            );
        }
    },
    requesters: requesters,
};
