const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, checkMusicChannel } = require('../../utils/voiceChannelCheck.js');
const { sendErrorResponse, sendSuccessResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { getLang } = require('../../utils/languageLoader');

const data = new SlashCommandBuilder()
  .setName("filters")
  .setDescription("Control audio filters")
  .addStringOption(option =>
    option.setName("filter")
      .setDescription("Select a filter to apply")
      .setRequired(true)
      .addChoices(
        { name: 'Karaoke', value: 'karaoke' },
        { name: 'Timescale', value: 'timescale' },
        { name: 'Tremolo', value: 'tremolo' },
        { name: 'Vibrato', value: 'vibrato' },
        { name: '3D', value: 'rotation' },
        { name: 'Distortion', value: 'distortion' },
        { name: 'Channel Mix', value: 'channelmix' },
        { name: 'Low Pass', value: 'lowpass' },
        { name: 'Bassboost', value: 'bassboost' },
        { name: 'Nightcore', value: 'nightcore' },
        { name: 'Daycore', value: 'daycore' },
        { name: 'Clear Filters', value: 'clear' }
      )
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
            const t = lang.music.filters;

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

            const selectedFilter = interaction.options.getString('filter');

            if (selectedFilter === 'clear') {
                queue.filters.clear();

                return await sendSuccessResponse(
                    interaction,
                    t.cleared.title + '\n\n' +
                    t.cleared.message + '\n' +
                    t.cleared.note
                );
            }

            const filterNames = {
                'karaoke': 'Karaoke',
                'timescale': 'Timescale',
                'tremolo': 'Tremolo',
                'vibrato': 'Vibrato',
                'rotation': '3D Rotation',
                'distortion': 'Distortion',
                'channelmix': 'Channel Mix',
                'lowpass': 'Low Pass',
                'bassboost': 'Bassboost',
                'nightcore': 'Nightcore',
                'daycore': 'Daycore'
            };

            // Map old filter choice values to DisTube filter names
            const filterMap = {
                'karaoke': 'karaoke',
                'timescale': 'nightcore',
                'tremolo': 'tremolo',
                'vibrato': 'phaser',
                'rotation': '3d',
                'distortion': 'flanger',
                'channelmix': 'surround',
                'lowpass': 'earwax',
                'bassboost': 'bassboost',
                'nightcore': 'nightcore',
                'daycore': 'vaporwave'
            };

            const distubeFilterName = filterMap[selectedFilter];

            if (!distubeFilterName) {
                return await sendErrorResponse(
                    interaction,
                    t.invalid.title + '\n\n' +
                    t.invalid.message + '\n' +
                    t.invalid.note
                );
            }

            queue.filters.add(distubeFilterName);

            return await sendSuccessResponse(
                interaction,
                t.success.title + '\n\n' +
                t.success.filter.replace('{filter}', filterNames[selectedFilter]) + '\n\n' +
                t.success.message + '\n' +
                t.success.note
            );

        } catch (error) {
            const lang = await getLang(interaction.guildId).catch(() => ({ music: { filters: { errors: {} } } }));
            const t = lang.music?.filters?.errors || {};

            return await handleCommandError(
                interaction,
                error,
                'filters',
                (t.title || '## ❌ Error') + '\n\n' + (t.message || 'An error occurred while applying the filter.\nPlease try again later.')
            );
        }
    }
};
