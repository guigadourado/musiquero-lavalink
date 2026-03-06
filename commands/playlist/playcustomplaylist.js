const { SlashCommandBuilder, ContainerBuilder, SectionBuilder, MessageFlags } = require('discord.js');
const { playlistCollection } = require('../../mongodb.js');
const config = require("../../config.js");
const musicIcons = require('../../UI/icons/musicicons.js');
const { sendErrorResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { checkVoiceChannel: checkVC } = require('../../utils/voiceChannelCheck.js');
const { getLang } = require('../../utils/languageLoader.js');

const data = new SlashCommandBuilder()
  .setName("playcustomplaylist")
  .setDescription("Play a custom playlist")
  .addStringOption(option =>
    option.setName("name")
      .setDescription("Enter playlist name")
      .setRequired(true)
  );

module.exports = {
    data: data,
    run: async (client, interaction) => {
        try {
            await interaction.deferReply();
            const lang = await getLang(interaction.guildId);

            const playlistName = interaction.options.getString('name');
            const userId = interaction.user.id;

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
                    `${lang.playlist.playcustomplaylist.notFound.title}\n\n` +
                    'You must be in a voice channel.\n' +
                    'Please join a voice channel and try again.',
                    5000
                );
            }

            const playlist = await playlistCollection.findOne({ name: playlistName });
            if (!playlist) {
                return sendErrorResponse(
                    interaction,
                    `${lang.playlist.playcustomplaylist.notFound.title}\n\n` +
                    `${lang.playlist.playcustomplaylist.notFound.message.replace('{name}', playlistName)}\n` +
                    `${lang.playlist.playcustomplaylist.notFound.note}`,
                    5000
                );
            }

            if (playlist.isPrivate && playlist.userId !== userId) {
                return sendErrorResponse(
                    interaction,
                    `${lang.playlist.playcustomplaylist.accessDenied.title}\n\n` +
                    `${lang.playlist.playcustomplaylist.accessDenied.message}\n` +
                    `${lang.playlist.playcustomplaylist.accessDenied.note}`,
                    5000
                );
            }

            if (!playlist.songs.length) {
                return sendErrorResponse(
                    interaction,
                    `${lang.playlist.playcustomplaylist.empty.title}\n\n` +
                    `${lang.playlist.playcustomplaylist.empty.message.replace('{name}', playlistName)}\n` +
                    `${lang.playlist.playcustomplaylist.empty.note}`,
                    5000
                );
            }

            const playOptions = {
                member: interaction.member,
                textChannel: interaction.channel,
            };

            let queued = 0;
            let first = true;
            for (const song of playlist.songs) {
                const query = song.url || song.name;
                try {
                    await client.distube.play(userVoiceChannel, query, playOptions);
                    queued++;
                    if (first) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        first = false;
                    }
                } catch (err) {
                    console.error(`[ PLAYCUSTOMPLAYLIST ] Error queueing "${query}":`, err.message);
                }
            }

            if (queued === 0) {
                return sendErrorResponse(
                    interaction,
                    `${lang.playlist.playcustomplaylist.resolveError.title}\n\n` +
                    `${lang.playlist.playcustomplaylist.resolveError.message}\n` +
                    `${lang.playlist.playcustomplaylist.resolveError.note}`,
                    5000
                );
            }

            const embedColor = parseInt(config.embedColor?.replace('#', '') || '1db954', 16);
            const components = [];

            const headerSection = new SectionBuilder()
                .addTextDisplayComponents(
                    (textDisplay) => textDisplay.setContent(
                        `${lang.playlist.playcustomplaylist.success.title}\n\n` +
                        `${lang.playlist.playcustomplaylist.success.message.replace('{name}', playlistName)}\n\n` +
                        `${lang.playlist.playcustomplaylist.success.songs.replace('{count}', queued)}`
                    )
                )
                .setThumbnailAccessory(
                    (thumbnail) => thumbnail.setURL(musicIcons.beats2Icon)
                );

            const headerContainer = new ContainerBuilder()
                .setAccentColor(embedColor)
                .addSectionComponents(headerSection);
            components.push(headerContainer);

            const reply = await interaction.editReply({
                components: components,
                flags: MessageFlags.IsComponentsV2,
                fetchReply: true
            });
            setTimeout(() => reply.delete().catch(() => {}), 3000);
            return reply;

        } catch (error) {
            const lang = await getLang(interaction.guildId).catch(() => ({ playlist: { playcustomplaylist: { errors: { title: '## ❌ Error', message: 'An error occurred.' } } } }));
            return handleCommandError(
                interaction,
                error,
                'playcustomplaylist',
                `${lang.playlist.playcustomplaylist.errors.title}\n\n` +
                `${lang.playlist.playcustomplaylist.errors.message}`
            );
        }
    }
};
