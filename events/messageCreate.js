const config = require('../config.js');
const { getLang } = require('../utils/languageLoader.js');
const colors = require('../UI/colors/colors');

module.exports = async (client, message) => {
  try {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Ignore DMs
    if (!message.guild) return;
    
    // Check if auto-play is enabled and if this channel is configured
    if (!config.autoPlayChannels || config.autoPlayChannels.length === 0) return;
    
    const channelId = message.channel.id;
    const channelName = message.channel.name.toLowerCase();
    
    // Check if channel is in the auto-play list (by ID or name)
    const isAutoPlayChannel = config.autoPlayChannels.some(ch => {
      if (typeof ch === 'string') {
        // Check by name (case-insensitive) or ID
        return ch.toLowerCase() === channelName || ch === channelId;
      }
      return ch === channelId;
    });
    
    if (!isAutoPlayChannel) return;
    
    // Ignore empty messages or messages that are too short
    const content = message.content.trim();
    if (!content || content.length < 2) return;
    
    // Ignore if message starts with common command prefixes (to avoid conflicts)
    const commandPrefixes = ['!', '/', '.', '-', '?', '$', '%', '&', '*'];
    if (commandPrefixes.some(prefix => content.startsWith(prefix))) return;
    
    // Get the play command
    const playCommand = client.commands.get('play');
    if (!playCommand) {
      console.warn(`${colors.cyan}[ AUTO-PLAY ]${colors.reset} ${colors.yellow}Play command not found${colors.reset}`);
      return;
    }
    
    // Fetch member if not cached (message.member can be null for uncached guild members)
    let member = message.member;
    if (!member && message.guild) {
      try {
        member = await message.guild.members.fetch(message.author.id);
      } catch (fetchError) {
        console.error(`${colors.cyan}[ AUTO-PLAY ]${colors.reset} ${colors.red}Failed to fetch member:${colors.reset}`, fetchError);
        // If we can't fetch the member, we can't proceed (need it for voice channel check)
        return;
      }
    }
    
    // If member is still null, we can't proceed
    if (!member) {
      console.warn(`${colors.cyan}[ AUTO-PLAY ]${colors.reset} ${colors.yellow}Member not available for auto-play${colors.reset}`);
      return;
    }
    
    // Create a mock interaction object that mimics a slash command interaction
    let replyMessage = null;
    let deferred = false;
    
    const mockInteraction = {
      guild: message.guild,
      guildId: message.guild.id,
      channel: message.channel,
      channelId: message.channel.id,
      member: member,
      user: message.author,
      options: {
        getString: (name) => {
          if (name === 'name') return content;
          return null;
        }
      },
      deferReply: async () => {
        deferred = true;
        // Send a typing indicator
        await message.channel.sendTyping().catch(() => {});
      },
      editReply: async (options) => {
        // If we already sent a message, edit it; otherwise send a new one
        try {
          if (replyMessage && !replyMessage.deleted) {
            return await replyMessage.edit(options);
          } else {
            replyMessage = await message.channel.send(options);
            // Auto-delete after a delay if it's a success message
            if (options.components && options.components.length > 0) {
              setTimeout(() => {
                replyMessage?.delete().catch(() => {});
              }, 5000);
            }
            return replyMessage;
          }
        } catch (err) {
          // If edit fails, try sending a new message
          try {
            replyMessage = await message.channel.send(options);
            if (options.components && options.components.length > 0) {
              setTimeout(() => {
                replyMessage?.delete().catch(() => {});
              }, 5000);
            }
            return replyMessage;
          } catch (sendErr) {
            console.error('Error sending auto-play response:', sendErr);
          }
        }
      },
      reply: async (options) => {
        // Send a regular message
        try {
          replyMessage = await message.channel.send(options);
          return replyMessage;
        } catch (err) {
          console.error('Error replying to auto-play:', err);
        }
      },
      followUp: async (options) => {
        // Send a regular message
        try {
          return await message.channel.send(options);
        } catch (err) {
          console.error('Error following up auto-play:', err);
        }
      },
      get deferred() {
        return deferred;
      },
      get replied() {
        return replyMessage !== null;
      },
      ephemeral: false
    };
    
    // Execute the play command with the mock interaction
    try {
      await playCommand.run(client, mockInteraction);
    } catch (error) {
      const lang = await getLang(message.guild.id).catch(() => ({ music: { play: { errors: {}, noNodes: {} } } }));
      const t = lang.music?.play || {};
      const errorMsg = error?.message || '';
      
      console.error(`${colors.cyan}[ AUTO-PLAY ]${colors.reset} ${colors.red}Error in auto-play:${colors.reset}`, error);
      
      // Check if error is "No nodes are available"
      if (errorMsg.includes('No nodes are available')) {
        const { getLavalinkManager } = require('../lavalink.js');
        const nodeManager = getLavalinkManager();
        if (nodeManager) {
          const nodeCount = nodeManager.getNodeCount();
          const totalCount = nodeManager.getTotalNodeCount();
          try {
            const noNodesMsg = (t.noNodes?.title || '## ❌ No Lavalink Nodes') + '\n\n' +
              (t.noNodes?.message || 'No Lavalink nodes are currently available ({connected}/{total} connected).')
                .replace('{connected}', nodeCount)
                .replace('{total}', totalCount) + '\n' +
              (t.noNodes?.note || 'The bot is attempting to reconnect. Please try again in a moment.');
            await message.channel.send(noNodesMsg).catch(() => {});
          } catch (sendError) {
            // Ignore send errors
          }
          return;
        }
      }
      
      // Send generic error message for other errors
      try {
        const genericErrorMsg = (t.errors?.title || '## ❌ Error') + '\n\n' + (t.errors?.message || 'An error occurred while processing the request.\nPlease try again later.');
        await message.channel.send(genericErrorMsg).catch(() => {});
      } catch (sendError) {
        // Ignore send errors
      }
    }
    
  } catch (error) {
    console.error(`${colors.cyan}[ AUTO-PLAY ]${colors.reset} ${colors.red}Unexpected error in messageCreate:${colors.reset}`, error);
  }
};

