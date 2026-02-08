const { SlashCommandBuilder } = require('discord.js');
const { setAutoplaySettings } = require('../../mongodb.js');
const { sendSuccessResponse, handleCommandError } = require('../../utils/responseHandler.js');
const { getLang } = require('../../utils/languageLoader');

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

            const lang = await getLang(interaction.guildId).catch(() => ({}));
            const t = lang?.music?.autoplay || {};

            const enable = interaction.options.getBoolean('enable');
            const guildId = String(interaction.guild.id);

            await setAutoplaySettings(guildId, { autoplay: enable });

            const content = enable
                ? (t.enabled?.title || '## ✅ Autoplay Enabled') + '\n\n' + (t.enabled?.message || 'Autoplay has been **enabled** for this server.') + '\n\n' + (t.enabled?.note || '🎵 The bot will automatically play similar songs when the queue ends.')
                : (t.disabled?.title || '## ❌ Autoplay Disabled') + '\n\n' + (t.disabled?.message || 'Autoplay has been **disabled** for this server.') + '\n\n' + (t.disabled?.note || '⏹️ The bot will stop playing when the queue ends.');

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
