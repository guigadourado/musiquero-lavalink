const { SlashCommandBuilder, ContainerBuilder, MessageFlags } = require('discord.js');
const config = require('../../config.js');
const musicIcons = require('../../UI/icons/musicicons.js');
const { autoplayCollection } = require('../../mongodb.js');
const { getLang } = require('../../utils/languageLoader.js');
const { handleCommandError } = require('../../utils/responseHandler.js');

const data = new SlashCommandBuilder()
  .setName("247")
  .setDescription("Toggle 24/7 mode (keep bot in voice channel)")
  .addBooleanOption(option =>
    option.setName("enable")
      .setDescription("Enable or disable 24/7 mode")
      .setRequired(true)
  );

module.exports = {
    data: data,
    run: async (client, interaction) => {
        try {
            await interaction.deferReply();
            const lang = await getLang(interaction.guildId).catch(() => ({}));
            const t = lang?.utility?.twentyfourseven || {};
            const accessDenied = t.accessDenied || { title: '## ❌ Access Denied', message: 'Only the server owner can toggle 24/7 mode.' };

            if (interaction.guild.ownerId !== interaction.user.id) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(0xff0000)
                    .addTextDisplayComponents(
                        (textDisplay) => textDisplay.setContent(
                            `${accessDenied.title}\n\n${accessDenied.message}`
                        )
                    );

                const reply = await interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2,
                });
                setTimeout(() => reply.delete().catch(() => {}), 3000);
                return reply;
            }

            const enable = interaction.options.getBoolean('enable');
            const guildId = String(interaction.guild.id);

            if (!autoplayCollection) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(0xff0000)
                    .addTextDisplayComponents(
                        (textDisplay) => textDisplay.setContent(
                            `${accessDenied.title}\n\nDatabase not available. 24/7 mode requires MongoDB.`
                        )
                    );
                const reply = await interaction.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return reply;
            }
            try {
                await autoplayCollection.updateOne(
                    { guildId },
                    { $set: { twentyfourseven: enable } },
                    { upsert: true }
                );
            } catch (dbErr) {
                console.error('[247] MongoDB update failed:', dbErr?.message || dbErr);
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(0xff0000)
                    .addTextDisplayComponents(
                        (textDisplay) => textDisplay.setContent('## ❌ Database unavailable\n\nCould not save settings. Make sure MongoDB is connected and try again.')
                    );
                const reply = await interaction.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return reply;
            }

            const embedColor = parseInt((enable ? '#00ff00' : '#ff0000').replace('#', ''), 16);
            const components = [];

            const enabledBlock = t.enabled || { title: '## ✅ 24/7 Mode Enabled', message: '24/7 mode has been **enabled** for this server.', note: '🔄 The bot will stay in the voice channel even when the queue is empty.' };
            const disabledBlock = t.disabled || { title: '## ❌ 24/7 Mode Disabled', message: '24/7 mode has been **disabled** for this server.', note: '⏹️ The bot will leave the voice channel when the queue ends.' };
            const statusText = enable
                ? `${enabledBlock.title}\n\n${enabledBlock.message}\n\n${enabledBlock.note}`
                : `${disabledBlock.title}\n\n${disabledBlock.message}\n\n${disabledBlock.note}`;

            const statusContainer = new ContainerBuilder()
                .setAccentColor(embedColor)
                .addTextDisplayComponents(
                    (textDisplay) => textDisplay.setContent(statusText)
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
            return handleCommandError(
                interaction,
                error,
                '247',
                null
            );
        }
    }
};
