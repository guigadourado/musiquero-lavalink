const { ContainerBuilder, MessageFlags } = require('discord.js');
const { getLang } = require('./languageLoader.js');
const config = require('../config.js');

async function checkVoiceChannel(interaction, player) {

    const lang = await getLang(interaction.guildId).catch(() => {
     
        return require('../languages/en.js');
    });
    

    const utils = lang?.utils || {};
    const voiceCheck = utils?.voiceChannelCheck || {
        noVoiceChannel: {
            title: "## ❌ No Voice Channel",
            message: "You need to be in a voice channel to use this command.",
            note: "Please join a voice channel and try again."
        },
        wrongChannel: {
            title: "## 🎵 Join Voice Channel",
            message: "The bot is currently active in **{channelName}**.",
            note: "Please join **{channelName}** to use music commands."
        }
    };
    
    if (!interaction.member.voice.channelId) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(0xff0000)
            .addTextDisplayComponents(
                (textDisplay) => textDisplay.setContent(
                    `${voiceCheck.noVoiceChannel.title}\n\n` +
                    `${voiceCheck.noVoiceChannel.message}\n` +
                    `${voiceCheck.noVoiceChannel.note}`
                )
            );
        return {
            allowed: false,
            response: {
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true,
            }
        };
    }

    if (player && player.voiceChannel && interaction.member.voice.channelId !== player.voiceChannel) {
        const botChannel = interaction.guild.channels.cache.get(player.voiceChannel);
        const channelName = botChannel ? botChannel.name : 'the bot\'s voice channel';

        const errorContainer = new ContainerBuilder()
            .setAccentColor(0xff0000)
            .addTextDisplayComponents(
                (textDisplay) => textDisplay.setContent(
                    `${voiceCheck.wrongChannel.title}\n\n` +
                    `${voiceCheck.wrongChannel.message.replace('{channelName}', channelName)}\n\n` +
                    `${voiceCheck.wrongChannel.note.replace('{channelName}', channelName)}`
                )
            );
        return {
            allowed: false,
            response: {
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true,
            }
        };
    }
    return { allowed: true };
}

async function checkMusicChannel(interaction) {
    // If no music channel is configured, allow commands in any channel
    if (!config.musicChannelId || config.musicChannelId === '') {
        return { allowed: true };
    }

    const channelId = interaction.channelId || interaction.channel?.id;
    
    // Check if the command is in the allowed music channel
    if (channelId !== config.musicChannelId) {
        const lang = await getLang(interaction.guildId).catch(() => {
            return require('../languages/en.js');
        });

        const utils = lang?.utils || {};
        const voiceCheck = utils?.voiceChannelCheck || {
            wrongTextChannel: {
                title: "## ❌ Wrong Channel",
                message: "Music commands can only be used in the designated music channel.",
                note: "Please use music commands in the correct channel."
            }
        };

        const musicChannel = interaction.guild?.channels.cache.get(config.musicChannelId);
        const channelName = musicChannel ? `<#${config.musicChannelId}>` : 'the music channel';

        const errorContainer = new ContainerBuilder()
            .setAccentColor(0xff0000)
            .addTextDisplayComponents(
                (textDisplay) => textDisplay.setContent(
                    `${voiceCheck.wrongTextChannel?.title || '## ❌ Wrong Channel'}\n\n` +
                    `${voiceCheck.wrongTextChannel?.message || 'Music commands can only be used in the designated music channel.'}\n\n` +
                    `${voiceCheck.wrongTextChannel?.note?.replace('{channel}', channelName) || `Please use music commands in ${channelName}.`}`
                )
            );
        
        return {
            allowed: false,
            response: {
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true,
            }
        };
    }

    return { allowed: true };
}

module.exports = { checkVoiceChannel, checkMusicChannel };

