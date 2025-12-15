const { SlashCommandBuilder } = require('discord.js');
const { autoplayCollection } = require('../../mongodb.js');
const { sendSuccessResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { getLang } = require('../../utils/languageLoader');
const { checkMusicChannel } = require('../../utils/voiceChannelCheck.js');

const data = new SlashCommandBuilder()
  .setName("autoplay")
  .setDescription("Toggle autoplay for the server")
  .addBooleanOption(option =>
    option.setName("enable")
      .setDescription("Toggle autoplay on / off")
      .setRequired(true)
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
            const t = lang.music.autoplay;

            const enable = interaction.options.getBoolean('enable');
            const guildId = interaction.guild.id;

            await autoplayCollection.updateOne(
                { guildId },
                { $set: { autoplay: enable } },
                { upsert: true }
            );

            const content = enable 
                ? t.enabled.title + '\n\n' + t.enabled.message + '\n\n' + t.enabled.note
                : t.disabled.title + '\n\n' + t.disabled.message + '\n\n' + t.disabled.note;

            return await sendSuccessResponse(
                interaction,
                content,
                enable ? '#00ff00' : '#ff0000'
            );

        } catch (error) {
            const lang = await getLang(interaction.guildId).catch(() => ({ music: { autoplay: { errors: {} } } }));
            const t = lang.music?.autoplay?.errors || {};
            
            return await handleCommandError(
                interaction,
                error,
                'autoplay',
                (t.title || '## ❌ Error') + '\n\n' + (t.message || 'An error occurred while updating autoplay settings.\nPlease try again later.')
            );
        }
    }
};
