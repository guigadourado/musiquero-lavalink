const { SlashCommandBuilder, ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { SearchResultType } = require('distube');
const config = require('../../config.js');
const { sendErrorResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { checkVoiceChannel: checkVC, checkMusicChannel } = require('../../utils/voiceChannelCheck.js');
const { getLang } = require('../../utils/languageLoader');

const data = new SlashCommandBuilder()
  .setName("search")
  .setDescription("Search for a song and select from results")
  .addStringOption(option =>
    option.setName("query")
      .setDescription("Search query for the song")
      .setRequired(true)
  );

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
            const lang = await getLang(interaction.guildId);
            const t = lang.music.search;

            const query = interaction.options.getString('query');

            await interaction.deferReply();

            // Check if command is in the allowed music channel
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

            // Ensure the user is in a voice channel
            const userVoiceChannel = interaction.member.voice.channel;
            if (!userVoiceChannel) {
                return sendErrorResponse(
                    interaction,
                    t.noResults?.title || '## ❌ Error' + '\n\n' +
                    'You must be in a voice channel to use this command.',
                    5000
                );
            }

            // Search for tracks using DisTube
            let results;
            try {
                results = await client.distube.search(query, SearchResultType.VIDEO, 5);
            } catch (searchError) {
                console.error('[ SEARCH ] Search error:', searchError);
                return sendErrorResponse(
                    interaction,
                    t.noResults.title + '\n\n' +
                    t.noResults.message + '\n' +
                    t.noResults.note,
                    5000
                );
            }

            if (!results || results.length === 0) {
                return sendErrorResponse(
                    interaction,
                    t.noResults.title + '\n\n' +
                    t.noResults.message + '\n' +
                    t.noResults.note,
                    5000
                );
            }

            const tracks = results.slice(0, 5);

            const searchResults = tracks.map((result, index) => {
                return t.results.track
                    .replace('{number}', index + 1)
                    .replace('{title}', result.name)
                    .replace('{uri}', result.url)
                    .replace('{author}', result.uploader?.name || 'Unknown')
                    // result.duration is in seconds; multiply by 1000 for formatDuration
                    .replace('{duration}', formatDuration(result.duration * 1000));
            }).join('\n\n');

            const embedColor = parseInt(config.embedColor?.replace('#', '') || '1db954', 16);
            const components = [];

            const resultsContainer = new ContainerBuilder()
                .setAccentColor(embedColor)
                .addTextDisplayComponents(
                    (textDisplay) => textDisplay.setContent(
                        t.results.title + '\n\n' +
                        t.results.query.replace('{query}', query) + '\n\n' +
                        searchResults
                    )
                );

            components.push(resultsContainer);

            const buttons = [];
            for (let i = 0; i < tracks.length; i++) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`search_select_${i}_${interaction.id}`)
                        .setLabel(`${i + 1}`)
                        .setStyle(ButtonStyle.Primary)
                );
            }

            const cancelButton = new ButtonBuilder()
                .setCustomId(`search_cancel_${interaction.id}`)
                .setLabel(t.buttons.cancel)
                .setStyle(ButtonStyle.Danger);

            buttons.push(cancelButton);

            const rows = [];
            for (let i = 0; i < buttons.length; i += 5) {
                rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
            }

            const message = await interaction.editReply({
                components: [...components, ...rows],
                flags: MessageFlags.IsComponentsV2,
                fetchReply: true
            });

            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id && (i.customId.startsWith('search_select_') || i.customId.startsWith('search_cancel_')) && i.customId.endsWith(`_${interaction.id}`),
                time: 15000
            });

            collector.on('collect', async (i) => {
                await i.deferUpdate();

                if (i.customId.startsWith('search_cancel_')) {
                    collector.stop();
                    setTimeout(() => {
                        message.delete().catch(() => {});
                    }, 1000);
                    return;
                }

                const trackIndex = parseInt(i.customId.split('_')[2]);
                if (isNaN(trackIndex) || trackIndex < 0 || trackIndex >= tracks.length) {
                    return;
                }

                const selectedResult = tracks[trackIndex];

                // Play/queue the selected track via DisTube
                await client.distube.play(userVoiceChannel, selectedResult.url, {
                    member: interaction.member,
                    textChannel: interaction.channel
                });

                collector.stop();
                setTimeout(() => {
                    message.delete().catch(() => {});
                }, 500);
            });

            collector.on('end', async () => {
                try {
                    setTimeout(() => {
                        message.delete().catch(() => {});
                    }, 500);
                } catch (error) {
                }
            });

        } catch (error) {
            const lang = await getLang(interaction.guildId).catch(() => ({ music: { search: { errors: {} } } }));
            const t = lang.music?.search?.errors || {};

            return handleCommandError(
                interaction,
                error,
                'search',
                (t.title || '## ❌ Error') + '\n\n' + (t.message || 'An error occurred while searching.\nPlease try again later.')
            );
        }
    }
};
