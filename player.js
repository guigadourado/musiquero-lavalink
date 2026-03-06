const { ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, SectionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionsBitField, MessageFlags, MediaGalleryBuilder } = require("discord.js");
const { EnhancedMusicCard } = require("./utils/musicCard");
const config = require("./config.js");
const musicIcons = require('./UI/icons/musicicons.js');
const colors = require('./UI/colors/colors');
const fs = require("fs").promises;
const path = require("path");
const { getAutoplaySettings, playlistCollection } = require('./mongodb.js');
const { initializeDistube } = require('./distube.js');

let getLangSync, getLang;
try {
    const langLoader = require('./utils/languageLoader.js');
    getLangSync = langLoader.getLangSync;
    getLang = langLoader.getLang;
} catch (e) {
    getLangSync = () => ({ console: {} });
    getLang = async () => ({ player: {} });
}

const guildTrackMessages = new Map();
const nowPlayingMessages = new Map();
const progressUpdateIntervals = new Map();
const musicCard = new EnhancedMusicCard();

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours   = Math.floor(ms / (1000 * 60 * 60));
    return [
        hours   > 0 ? `${hours}h`   : null,
        minutes > 0 ? `${minutes}m` : null,
        `${seconds}s`,
    ].filter(Boolean).join(' ');
}

function createProgressBar(currentMs, totalMs, length = 20) {
    const progress = totalMs > 0 ? Math.round((currentMs / totalMs) * length) : 0;
    const empty    = length - progress;
    return `\`${formatDuration(currentMs)}\` ${'▓'.repeat(Math.max(0, progress))}${'░'.repeat(Math.max(0, empty))} \`${formatDuration(totalMs)}\``;
}

function createActionRow1(disabled) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("loopToggle") .setEmoji('🔁').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId("disableLoop").setEmoji('❌').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId("skipTrack")  .setEmoji('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId("showLyrics") .setEmoji('🎤').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId("clearQueue") .setEmoji('🗑️').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    );
}

function createActionRow2(disabled) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("stopTrack")  .setEmoji('⏹️').setStyle(ButtonStyle.Danger)    .setDisabled(disabled),
        new ButtonBuilder().setCustomId("pauseTrack") .setEmoji('⏸️').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId("resumeTrack").setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId("volumeUp")   .setEmoji('🔊').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId("volumeDown") .setEmoji('🔉').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    );
}

async function sendEmbed(channel, message) {
    const container = new ContainerBuilder()
        .setAccentColor(parseInt(config.embedColor?.replace('#', '') || '1db954', 16))
        .addTextDisplayComponents(td => td.setContent(message));
    const msg = await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    setTimeout(() => msg.delete().catch(() => {}), (config.embedTimeout || 5) * 1000);
}

async function sendMessageWithPermissionsCheck(channel, components, attachment, row1, row2) {
    try {
        const perms = channel.permissionsFor(channel.guild.members.me);
        const required = [
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.UseExternalEmojis,
        ];
        if (!required.every(p => perms.has(p))) {
            console.error(getLangSync().console?.player?.lacksPermissions || "Bot lacks permissions to send messages here.");
            return null;
        }
        const opts = { components: [...components, row1, row2], flags: MessageFlags.IsComponentsV2 };
        if (attachment) opts.files = [attachment];
        return await channel.send(opts);
    } catch (error) {
        console.error("Error sending track message:", error.message);
        return null;
    }
}

// ─── cleanup ─────────────────────────────────────────────────────────────────

async function cleanupPreviousTrackMessages(channel, guildId) {
    for (const info of guildTrackMessages.get(guildId) || []) {
        try {
            const ch = channel.client.channels.cache.get(info.channelId);
            const msg = ch && await ch.messages.fetch(info.messageId).catch(() => null);
            if (msg) await msg.delete().catch(() => {});
        } catch { /* ignore */ }
    }
    guildTrackMessages.set(guildId, []);
}

async function cleanupTrackMessagesByGuildId(client, guildId) {
    const intervalId = progressUpdateIntervals.get(guildId);
    if (intervalId) { clearInterval(intervalId); progressUpdateIntervals.delete(guildId); }

    for (const info of guildTrackMessages.get(guildId) || []) {
        try {
            const ch  = client.channels.cache.get(info.channelId);
            const msg = ch && await ch.messages.fetch(info.messageId).catch(() => null);
            if (msg) await msg.delete().catch(() => {});
        } catch { /* ignore */ }
    }
    guildTrackMessages.set(guildId, []);
    nowPlayingMessages.delete(guildId);
}

// Legacy signature: cleanupTrackMessages(client, player) where player.guildId exists
async function cleanupTrackMessages(client, playerOrQueue) {
    const guildId = playerOrQueue?.guildId || playerOrQueue?.id;
    if (guildId) await cleanupTrackMessagesByGuildId(client, guildId);
}

// ─── button collector ────────────────────────────────────────────────────────

function setupCollector(client, guildId, channel, message) {
    const BUTTON_IDS = new Set([
        'loopToggle','skipTrack','disableLoop','showLyrics','clearQueue',
        'stopTrack','pauseTrack','resumeTrack','volumeUp','volumeDown',
    ]);
    const collector = message.createMessageComponentCollector({
        filter: i => BUTTON_IDS.has(i.customId),
        time: 300_000,
    });

    collector.on('collect', async i => {
        await i.deferUpdate();
        const queue = client.distube.getQueue(guildId);
        if (!queue) {
            const lang = await getLang(guildId).catch(() => ({ console: { player: {} } }));
            await sendEmbed(channel, lang.console?.player?.controls?.playerDestroyed || '❌ **Player is not available!**');
            return;
        }

        const voiceChannel = i.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== queue.voiceChannel?.id) {
            const lang = await getLang(guildId).catch(() => ({ console: { player: {} } }));
            const t = lang.console?.player || {};
            const vcContainer = new ContainerBuilder()
                .setAccentColor(parseInt(config.embedColor?.replace('#','') || '1db954', 16))
                .addTextDisplayComponents(td => td.setContent(
                    `${t.voiceChannelRequired?.title || '## 🔒 Voice Channel Required'}\n\n` +
                    `${t.voiceChannelRequired?.message || 'You need to be in the same voice channel to use controls!'}`
                ));
            const m = await channel.send({ components: [vcContainer], flags: MessageFlags.IsComponentsV2 });
            setTimeout(() => m.delete().catch(() => {}), (config.embedTimeout || 5) * 1000);
            return;
        }

        await handleButtonInteraction(client, i, queue, channel, guildId);
    });
}

async function handleButtonInteraction(client, i, queue, channel, guildId) {
    const lang = await getLang(guildId).catch(() => ({ console: { player: {} } }));
    const t    = lang.console?.player || {};
    const vc   = queue.voiceChannel;

    switch (i.customId) {
        case 'loopToggle': {
            // cycle: none→song→queue
            const next = queue.repeatMode === 0 ? 1 : queue.repeatMode === 1 ? 2 : 1;
            client.distube.setRepeatMode(vc, next);
            await sendEmbed(channel, next === 1
                ? (t.controls?.trackLoopActivated || "🔁 **Track loop activated!**")
                : (t.controls?.queueLoopActivated || "🔁 **Queue loop activated!**"));
            break;
        }
        case 'disableLoop':
            client.distube.setRepeatMode(vc, 0);
            await sendEmbed(channel, t.controls?.loopDisabled || "❌ **Loop disabled!**");
            break;
        case 'skipTrack': {
            await cleanupTrackMessagesByGuildId(client, guildId);
            try { await client.distube.skip(vc); } catch { /* queue ended */ }
            await sendEmbed(channel, t.controls?.skip || "⏭️ **Skipping to next song...**");
            break;
        }
        case 'showLyrics':
            showLyrics(client, channel, queue, guildId);
            break;
        case 'clearQueue':
            queue.songs.splice(1);
            await sendEmbed(channel, t.controls?.queueCleared || "🗑️ **Queue cleared!**");
            break;
        case 'stopTrack':
            await cleanupTrackMessagesByGuildId(client, guildId);
            try { await client.distube.stop(vc); } catch { /* ignore */ }
            await sendEmbed(channel, t.controls?.playbackStopped || "⏹️ **Playback stopped!**");
            break;
        case 'pauseTrack':
            if (queue.paused) { await sendEmbed(channel, t.controls?.alreadyPaused || '⏸️ **Already paused!**'); break; }
            client.distube.pause(vc);
            await sendEmbed(channel, t.controls?.playbackPaused || '⏸️ **Paused!**');
            break;
        case 'resumeTrack':
            if (!queue.paused) { await sendEmbed(channel, t.controls?.alreadyResumed || '▶️ **Already playing!**'); break; }
            client.distube.resume(vc);
            await sendEmbed(channel, t.controls?.playbackResumed || '▶️ **Resumed!**');
            break;
        case 'volumeUp': {
            const newVol = Math.min(100, queue.volume + 10);
            if (newVol === queue.volume) { await sendEmbed(channel, t.controls?.volumeMax || '🔊 **Volume already at max!**'); break; }
            client.distube.setVolume(vc, newVol);
            await sendEmbed(channel, (t.controls?.volumeChanged || '🔊 **Volume: {volume}%**').replace('{volume}', newVol));
            break;
        }
        case 'volumeDown': {
            const newVol = Math.max(10, queue.volume - 10);
            if (newVol === queue.volume) { await sendEmbed(channel, t.controls?.volumeMin || '🔉 **Volume already at min!**'); break; }
            client.distube.setVolume(vc, newVol);
            await sendEmbed(channel, (t.controls?.volumeChanged || '🔉 **Volume: {volume}%**').replace('{volume}', newVol));
            break;
        }
    }
}

// ─── lyrics ──────────────────────────────────────────────────────────────────

async function getLyrics(trackName, artistName, durationSec) {
    try {
        trackName  = trackName .replace(/\b(Official|Audio|Video|Lyrics|Soundtrack|HD|4K|Live|Remix|Cover|Version)\b/gi,'').replace(/\s*[-_|]\s*/g,' ').replace(/\s+/g,' ').trim();
        artistName = artistName.replace(/\b(Topic|VEVO|Records|Label|Ltd|Inc|DJ)\b/gi,'').replace(/ x /gi,' & ').replace(/\s+/g,' ').trim();
        if (!trackName || !artistName) return null;

        const base = 'https://lrclib.net/api/get';
        for (const qs of [
            `track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}&duration=${durationSec}`,
            `track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`,
        ]) {
            const res  = await fetch(`${base}?${qs}`, { signal: AbortSignal.timeout(5000) });
            const data = res.ok ? await res.json() : null;
            if (data?.syncedLyrics || data?.plainLyrics) return data.syncedLyrics || data.plainLyrics;
        }
    } catch (e) {
        console.error("Lyrics fetch error:", e.message);
    }
    return null;
}

async function showLyrics(client, channel, queue, guildId) {
    const lang = await getLang(guildId).catch(() => ({ console: { player: {} } }));
    const t    = lang.console?.player || {};
    const song = queue.songs[0];
    if (!song) { await sendEmbed(channel, t.lyrics?.noSongPlaying || "🚫 **No song playing.**"); return; }

    const lyrics = await getLyrics(song.name, song.uploader?.name || 'Unknown', song.duration || 0);
    if (!lyrics) { await sendEmbed(channel, t.lyrics?.notFound || "❌ **Lyrics not found!**"); return; }

    const lines       = lyrics.split('\n').map(l => l.trim()).filter(Boolean);
    const embedColor  = parseInt(config.embedColor?.replace('#','') || '1db954', 16);
    const stopButton  = new ButtonBuilder().setCustomId("stopLyrics").setLabel(t.lyrics?.stopButton || "Stop Lyrics").setStyle(ButtonStyle.Danger);
    const fullButton  = new ButtonBuilder().setCustomId("fullLyrics").setLabel(t.lyrics?.fullButton || "Full Lyrics").setStyle(ButtonStyle.Primary);
    const row         = new ActionRowBuilder().addComponents(fullButton, stopButton);

    const initContainer = new ContainerBuilder()
        .setAccentColor(embedColor)
        .addTextDisplayComponents(td => td.setContent(
            `${(t.lyrics?.liveTitle || '## 🎵 Live Lyrics: {title}').replace('{title}', song.name)}\n\n${t.lyrics?.syncing || '🔄 Syncing...'}`
        ));
    const message = await channel.send({ components: [initContainer, row], flags: MessageFlags.IsComponentsV2 });

    // track in cleanup map
    if (!guildTrackMessages.has(guildId)) guildTrackMessages.set(guildId, []);
    guildTrackMessages.get(guildId).push({ messageId: message.id, channelId: channel.id, type: 'lyrics' });

    const updateLyrics = async () => {
        const q           = client.distube.getQueue(guildId);
        const currentSec  = q ? q.currentTime : 0;
        const idx         = Math.floor(currentSec * (lines.length / (song.duration || 1)));
        const visible     = lines.slice(Math.max(0, idx - 3), Math.min(lines.length, idx + 3)).join('\n');
        const lang2       = await getLang(guildId).catch(() => ({ console: { player: {} } }));
        const t2          = lang2.console?.player || {};
        const updated     = new ContainerBuilder()
            .setAccentColor(embedColor)
            .addTextDisplayComponents(td => td.setContent(
                `${(t2.lyrics?.liveTitle || '## 🎵 Live Lyrics: {title}').replace('{title}', song.name)}\n\n${visible}`
            ));
        await message.edit({ components: [updated, row], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    };

    const interval    = setInterval(updateLyrics, 3000);
    updateLyrics();

    const collector   = message.createMessageComponentCollector({ time: 300_000 });
    collector.on('collect', async i => {
        await i.deferUpdate();
        if (i.customId === 'stopLyrics') { clearInterval(interval); await message.delete().catch(() => {}); }
        else if (i.customId === 'fullLyrics') {
            clearInterval(interval);
            const lang2 = await getLang(guildId).catch(() => ({ console: { player: {} } }));
            const t2    = lang2.console?.player || {};
            const fullC = new ContainerBuilder()
                .setAccentColor(embedColor)
                .addTextDisplayComponents(td => td.setContent(
                    `${(t2.lyrics?.fullTitle || '## 🎵 Full Lyrics: {title}').replace('{title}', song.name)}\n\n${lines.join('\n')}`
                ));
            const delBtn = new ButtonBuilder().setCustomId("deleteLyrics").setLabel(t2.lyrics?.deleteButton || "Delete").setStyle(ButtonStyle.Danger);
            await message.edit({ components: [fullC, new ActionRowBuilder().addComponents(delBtn)], flags: MessageFlags.IsComponentsV2 });
        } else if (i.customId === 'deleteLyrics') { await message.delete().catch(() => {}); }
    });
    collector.on('end', () => { clearInterval(interval); message.delete().catch(() => {}); });
}

// ─── now-playing card + progress updates ─────────────────────────────────────

async function buildNowPlayingComponents(song, guildId, positionMs) {
    const lang   = await getLang(guildId).catch(() => ({ console: { player: {} } }));
    const t      = lang.console?.player || {};
    const color  = parseInt('#FF7A00'.replace('#',''), 16);

    const title    = song.name          || 'Unknown Title';
    const author   = song.uploader?.name || 'Unknown Artist';
    const url      = song.url;
    const source   = song.source        || 'youtube';
    const requester= song.member?.user?.username || 'Unknown';
    const durationMs = (song.duration || 0) * 1000;

    const headerSection = new SectionBuilder()
        .addTextDisplayComponents(td => td.setContent(
            `${t.trackInfo?.title     || '**Title:**'}     [${title}](${url})\n` +
            `${t.trackInfo?.author    || '**Author:**'}    ${author}\n` +
            `${t.trackInfo?.length    || '**Length:**'}    ${formatDuration(durationMs)}\n` +
            `${t.trackInfo?.requester || '**Requester:**'} ${requester}\n` +
            `${t.trackInfo?.source   || '**Source:**'}    ${source}` +
            (config.showProgressBar !== false
                ? `\n${t.trackInfo?.progress || '**Progress:**'} ${createProgressBar(positionMs, durationMs)}`
                : '')
        ))
        .setThumbnailAccessory(th => th.setURL(musicIcons.playerIcon));

    const components = [
        new ContainerBuilder().setAccentColor(color).addSectionComponents(headerSection),
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
        new ContainerBuilder().setAccentColor(color).addTextDisplayComponents(td => td.setContent(
            `🔁 \`${t.controlLabels?.loop    || 'Loop'}\` • ❌ \`${t.controlLabels?.disable || 'Disable'}\` • ⏭️ \`${t.controlLabels?.skip   || 'Skip'}\` • 🎤 \`Lyrics\` • 🗑️ \`${t.controlLabels?.clear  || 'Clear'}\`\n` +
            `⏹️ \`${t.controlLabels?.stop    || 'Stop'}\` • ⏸️ \`${t.controlLabels?.pause  || 'Pause'}\` • ▶️ \`${t.controlLabels?.resume || 'Resume'}\` • 🔊 \`${t.controlLabels?.volUp  || 'Vol +'}\` • 🔉 \`${t.controlLabels?.volDown || 'Vol -'}\``
        )),
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    ];

    return { components, color, title, author, url, source, requester, durationMs };
}

async function startProgressUpdates(client, guildId, message, song) {
    let updateCount = 0;
    const interval  = setInterval(async () => {
        try {
            const queue = client.distube.getQueue(guildId);
            if (!queue || queue.songs[0]?.url !== song.url) {
                clearInterval(interval);
                progressUpdateIntervals.delete(guildId);
                nowPlayingMessages.delete(guildId);
                return;
            }
            const stored = nowPlayingMessages.get(guildId);
            if (!stored) { clearInterval(interval); progressUpdateIntervals.delete(guildId); return; }

            const posMs = (queue.currentTime || 0) * 1000;
            const { components } = await buildNowPlayingComponents(song, guildId, posMs);

            const thumbnail = song.thumbnail || '';
            if (config.generateSongCard !== false && !config.lowMemoryMode) {
                components.push(new MediaGalleryBuilder().addItems(item => item.setURL('attachment://song-banner.png').setDescription(`${song.name} - ${song.uploader?.name || ''}`)));
            } else if (thumbnail.startsWith('http')) {
                components.push(new MediaGalleryBuilder().addItems(item => item.setURL(thumbnail).setDescription(`${song.name}`)));
            }

            const row1 = createActionRow1(false);
            const row2 = createActionRow2(false);
            const ch   = client.channels.cache.get(stored.channelId);
            const msg  = ch && await ch.messages.fetch(stored.messageId).catch(() => null);
            if (!msg) { clearInterval(interval); progressUpdateIntervals.delete(guildId); return; }

            const shouldRegen = config.generateSongCard !== false && !config.lowMemoryMode && (updateCount === 0 || updateCount % 6 === 0);
            if (shouldRegen) {
                let thumbnailURL = thumbnail.startsWith('http') ? thumbnail : song.url;
                const cardBuffer = await musicCard.generateCard({
                    thumbnailURL, trackURI: song.url, songTitle: song.name,
                    songArtist: song.uploader?.name || 'Unknown Artist',
                    trackRequester: song.member?.user?.username || 'Unknown',
                    isPlaying: true, showVisualizer: config.showVisualizer !== false,
                });
                await msg.edit({ components: [...components, row1, row2], files: [new AttachmentBuilder(cardBuffer, { name: 'song-banner.png' })], flags: MessageFlags.IsComponentsV2 });
            } else {
                await msg.edit({ components: [...components, row1, row2], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
            }
            updateCount++;
        } catch {
            clearInterval(interval);
            progressUpdateIntervals.delete(guildId);
            nowPlayingMessages.delete(guildId);
        }
    }, 15_000);
    return interval;
}

// ─── initializePlayer ─────────────────────────────────────────────────────────

async function initializePlayer(client) {
    const distube = initializeDistube(client);

    // ── error ──
    distube.on('error', async (voiceChannel, error) => {
        console.error(`${colors.cyan}[ DISTUBE ]${colors.reset} ${colors.red}Error: ${error?.message || error}${colors.reset}`);
        const queue = voiceChannel && client.distube.getQueue(voiceChannel);
        const channel = queue?.textChannel;
        if (!channel) return;
        const lang = await getLang(queue.id).catch(() => ({ console: { player: {} } }));
        const t = lang.console?.player || {};
        const errContainer = new ContainerBuilder().setAccentColor(0xff0000)
            .addTextDisplayComponents(td => td.setContent(
                `${t.trackError?.title || '## ⚠️ Track Error'}\n\n` +
                `${t.trackError?.message || 'Failed to load the track.'}\n` +
                `${t.trackError?.skipping || 'Skipping to next song...'}`
            ));
        channel.send({ components: [errContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {})
            .then(m => m && setTimeout(() => m.delete().catch(() => {}), 5000));
    });

    // ── playSong ──
    distube.on('playSong', async (queue, song) => {
        if (!song) return;
        await new Promise(r => setTimeout(r, 200));

        const guildId = queue.id;
        if (client.statusManager) await client.statusManager.onTrackStart(guildId).catch(() => {});

        const channel = queue.textChannel;
        if (!channel) return;

        const lang = await getLang(guildId).catch(() => getLangSync());
        const t    = lang.console?.player || {};

        // save to history
        try {
            await playlistCollection.updateOne(
                { guildId, name: '__HISTORY__' },
                { $push: { songs: { $each: [song.url], $slice: -100 } } },
                { upsert: true }
            );
        } catch (e) { console.error("Error saving history:", e.message); }

        try {
            await cleanupPreviousTrackMessages(channel, guildId);
            await new Promise(r => setTimeout(r, 500));

            const posMs = 0;
            const { components } = await buildNowPlayingComponents(song, guildId, posMs);

            let attachment = null;
            const thumbnail = song.thumbnail || '';
            const shouldCard = config.generateSongCard !== false && !config.lowMemoryMode;

            if (shouldCard) {
                let thumbnailURL = thumbnail.startsWith('http') ? thumbnail : song.url;
                const cardBuffer = await musicCard.generateCard({
                    thumbnailURL, trackURI: song.url, songTitle: song.name,
                    songArtist: song.uploader?.name || 'Unknown Artist',
                    trackRequester: song.member?.user?.username || 'Unknown',
                    isPlaying: true, showVisualizer: config.showVisualizer !== false,
                });
                const cardPath = path.join(__dirname, 'musicard.png');
                await fs.writeFile(cardPath, cardBuffer);
                attachment = new AttachmentBuilder(cardBuffer, { name: 'song-banner.png' });
                components.push(new MediaGalleryBuilder().addItems(item =>
                    item.setURL('attachment://song-banner.png').setDescription(`${song.name} - ${song.uploader?.name || ''}`)
                ));
            } else if (thumbnail.startsWith('http')) {
                components.push(new MediaGalleryBuilder().addItems(item =>
                    item.setURL(thumbnail).setDescription(song.name)
                ));
            }

            const row1 = createActionRow1(false);
            const row2 = createActionRow2(false);
            const message = await sendMessageWithPermissionsCheck(channel, components, attachment, row1, row2);
            if (!message) return;

            if (!guildTrackMessages.has(guildId)) guildTrackMessages.set(guildId, []);
            guildTrackMessages.get(guildId).push({ messageId: message.id, channelId: channel.id, type: 'track' });
            nowPlayingMessages.set(guildId, { messageId: message.id, channelId: channel.id });

            progressUpdateIntervals.set(guildId, await startProgressUpdates(client, guildId, message, song));
            setupCollector(client, guildId, channel, message);
        } catch (error) {
            console.error("Error sending track card:", error.message);
            const lang2 = await getLang(guildId).catch(() => ({ console: { player: {} } }));
            const t2    = lang2.console?.player || {};
            const errC  = new ContainerBuilder().setAccentColor(0xff0000)
                .addTextDisplayComponents(td => td.setContent(
                    `${t2.unableToLoadCard?.title || '## ⚠️ Unable to Load Track Card'}\n\n` +
                    `${t2.unableToLoadCard?.message || 'Unable to load track card. Continuing playback...'}`
                ));
            await channel.send({ components: [errC], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        }
    });

    // ── finishSong ──
    distube.on('finishSong', async (queue, song) => {
        const guildId = queue.id;
        if (client.statusManager) await client.statusManager.onTrackEnd(guildId).catch(() => {});

        const intervalId = progressUpdateIntervals.get(guildId);
        if (intervalId) { clearInterval(intervalId); progressUpdateIntervals.delete(guildId); }
        nowPlayingMessages.delete(guildId);

        const channel  = queue.textChannel;
        const settings = await getAutoplaySettings(guildId).catch(() => ({ autoplay: true }));
        const hasNext  = queue.songs.length > 1 || queue.repeatMode !== 0 || settings.autoplay;

        if (channel) {
            if (!hasNext) await cleanupTrackMessagesByGuildId(client, guildId);
            else          await cleanupPreviousTrackMessages(channel, guildId);
        }
    });

    // ── finish (queue ended) ──
    distube.on('finish', async (queue) => {
        const guildId = queue.id;
        const channel = queue.textChannel;
        try {
            const settings = await getAutoplaySettings(String(guildId)).catch(() => ({ autoplay: true, twentyfourseven: true }));

            if (settings.autoplay) {
                if (channel) await cleanupPreviousTrackMessages(channel, guildId);
                try {
                    await distube.addRelatedSong(queue.voiceChannel);
                } catch {
                    await cleanupTrackMessagesByGuildId(client, guildId);
                    nowPlayingMessages.delete(guildId);
                    const lang = await getLang(guildId).catch(() => ({ console: { player: {} } }));
                    const t = lang.console?.player || {};
                    if (!settings.twentyfourseven) {
                        if (channel) { const m = await channel.send(t.queueEnd?.noMoreAutoplay || "⚠️ **No more tracks to autoplay. Disconnecting...**"); setTimeout(() => m.delete().catch(() => {}), 5000); }
                    } else {
                        if (channel) { const m = await channel.send(t.queueEnd?.twentyfoursevenEmpty || "🔄 **24/7 Mode: Staying in voice channel. Queue empty.**"); setTimeout(() => m.delete().catch(() => {}), 5000); }
                    }
                }
            } else {
                await cleanupTrackMessagesByGuildId(client, guildId);
                nowPlayingMessages.delete(guildId);
                const lang = await getLang(guildId).catch(() => ({ console: { player: {} } }));
                const t = lang.console?.player || {};
                if (!settings.twentyfourseven) {
                    if (channel) { const m = await channel.send(t.queueEnd?.queueEndedAutoplayDisabled || "🎶 **Queue ended. Autoplay disabled.**"); setTimeout(() => m.delete().catch(() => {}), 5000); }
                } else {
                    if (channel) { const m = await channel.send(t.queueEnd?.twentyfoursevenEmpty || "🔄 **24/7 Mode: Staying in voice channel. Queue empty.**"); setTimeout(() => m.delete().catch(() => {}), 5000); }
                }
            }
        } catch (error) {
            console.error("Error handling queue finish:", error.message);
            await cleanupTrackMessagesByGuildId(client, guildId);
        }
    });

    // ── disconnect ──
    distube.on('disconnect', async (queue) => {
        const guildId = queue.id;
        console.warn(`${colors.cyan}[ DISTUBE ]${colors.reset} ${colors.yellow}Disconnected from guild ${guildId}${colors.reset}`);
        if (client.statusManager) await client.statusManager.onPlayerDisconnect(guildId).catch(() => {});
        const intervalId = progressUpdateIntervals.get(guildId);
        if (intervalId) { clearInterval(intervalId); progressUpdateIntervals.delete(guildId); }
        nowPlayingMessages.delete(guildId);
        await cleanupTrackMessagesByGuildId(client, guildId);
    });
}

module.exports = { initializePlayer, cleanupTrackMessages, nowPlayingMessages };
