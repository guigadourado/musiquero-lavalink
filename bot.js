const { Client, GatewayIntentBits } = require("discord.js");
const config = require("./config.js");
const fs = require("fs");
const path = require('path');
const { initializePlayer } = require('./player');
const { connectToDatabase } = require('./mongodb');
const colors = require('./UI/colors/colors');
const { getLavalinkManager } = require('./lavalink.js');
const { getLang, getLangSync } = require('./utils/languageLoader.js');
require('dotenv').config();

const client = new Client({
    intents: Object.keys(GatewayIntentBits).map((a) => {
        return GatewayIntentBits[a];
    }),
});

client.config = config;


process.on('unhandledRejection', (error) => {
    const lang = getLangSync();
    if (error && error.message && (
        error.message.includes('Cannot read properties of null') ||
        error.message.includes('track.info') ||
        error.message.includes('thumbnail') ||
        error.message.includes('player.restart is not a function') ||
        error.message.includes('restart is not a function')
    )) {
   
        if (error.message.includes('player.restart') || error.message.includes('restart is not a function')) {
            console.warn(`${colors.cyan}[ LAVALINK ]${colors.reset} ${colors.yellow}Ignoring Riffy reconnect bug: ${error.message}${colors.reset}`);
        }
        return;
    }
    
    // timeout errors
    if (error && (error.cause || error.message)) {
        const cause = error.cause || {};
        const errorMsg = error.message || '';
        
        if (cause.code === 'UND_ERR_CONNECT_TIMEOUT' || 
            errorMsg.includes('Connect Timeout') || 
            errorMsg.includes('fetch failed') ||
            errorMsg.includes('ConnectTimeoutError')) {
            console.warn(`${colors.cyan}[ LAVALINK ]${colors.reset} ${colors.yellow}Connection timeout to Lavalink node - will retry automatically${colors.reset}`);
            return; 
        }
    }
    
    console.error(lang.console?.bot?.unhandledRejection || 'Unhandled Rejection:', error);
});

initializePlayer(client).catch(error => {
    const lang = getLangSync();
    console.error(`${colors.cyan}[ LAVALINK ]${colors.reset} ${colors.red}${lang.console?.bot?.lavalinkError?.replace('{message}', error.message) || `Error initializing player: ${error.message}`}${colors.reset}`);
});

client.on("clientReady", () => {
    const lang = getLangSync();
    console.log(`${colors.cyan}[ SYSTEM ]${colors.reset} ${colors.green}${lang.console?.bot?.clientLogged?.replace('{tag}', client.user.tag) || `Client logged as ${client.user.tag}`}${colors.reset}`);
    console.log(`${colors.cyan}[ MUSIC ]${colors.reset} ${colors.green}${lang.console?.bot?.musicSystemReady || 'Riffy Music System Ready 🎵'}${colors.reset}`);
   
    const nodeManager = getLavalinkManager();
    if (nodeManager) {
        nodeManager.init(client.user.id);
        
        setTimeout(() => {
            const status = nodeManager.getNodeStatus();
            const availableCount = nodeManager.getNodeCount();
            const totalCount = nodeManager.getTotalNodeCount();
            
            console.log(`${colors.cyan}[ LAVALINK ]${colors.reset} ${colors.green}${lang.console?.bot?.nodeManagerStatus?.replace('{available}', availableCount).replace('{total}', totalCount) || `Node Manager: ${availableCount}/${totalCount} nodes available`}${colors.reset}`);
            
            if (status.nodes.length > 0) {
                console.log(`${colors.cyan}[ LAVALINK ]${colors.reset} ${lang.console?.bot?.nodeStatus || 'Node Status:'}`);
                for (const node of status.nodes) {
                    const statusIcon = node.online ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
                    const statusText = node.online ? 'ONLINE' : 'OFFLINE';
                    const errorText = node.lastError ? ` | ${colors.yellow}${node.lastError}${colors.reset}` : '';
                    const nodeInfo = lang.console?.bot?.nodeInfo?.replace('{icon}', statusIcon).replace('{name}', node.name).replace('{host}', node.host).replace('{port}', node.port).replace('{status}', statusText).replace('{error}', errorText) || `  ${statusIcon} ${colors.yellow}${node.name}${colors.reset} (${node.host}:${node.port}) - ${statusText}${errorText}`;
                    console.log(nodeInfo);
                }
            }
        }, 3000);
    } else if (client.riffy) {
        client.riffy.init(client.user.id);
    }
});

fs.readdir("./events", (_err, files) => {
  files.forEach((file) => {
    if (!file.endsWith(".js")) return;
    const event = require(`./events/${file}`);
    let eventName = file.split(".")[0]; 
    client.on(eventName, event.bind(null, client));
    delete require.cache[require.resolve(`./events/${file}`)];
  });
});



client.commands = new Map();
client.commandsArray = [];


const loadCommands = () => {
  const loadCommandsFromDir = (dir, category = '') => {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
    
        loadCommandsFromDir(fullPath, item.name);
      } else if (item.isFile() && item.name.endsWith('.js')) {
        try {
       
          const absolutePath = path.resolve(fullPath);
          const command = require(absolutePath);
          
          if (command.data && command.run) {
            client.commands.set(command.data.name, command);
            client.commandsArray.push(command.data.toJSON());
            const categoryInfo = category ? ` [${category}]` : '';
            //console.log(`${colors.cyan}[ COMMANDS ]${colors.reset} ${colors.green}Loaded: ${colors.yellow}${command.data.name}${categoryInfo}${colors.reset}`);
          } else {
            const lang = getLangSync();
            console.log(`${colors.cyan}[ COMMANDS ]${colors.reset} ${colors.red}${lang.console?.bot?.commandLoadFailed?.replace('{name}', item.name) || `Failed to load: ${item.name} - Missing data or run property`}${colors.reset}`);
      }
        } catch (error) {
          const lang = getLangSync();
          console.error(`${colors.cyan}[ COMMANDS ]${colors.reset} ${colors.red}${lang.console?.bot?.commandLoadError?.replace('{name}', item.name).replace('{message}', error.message) || `Error loading ${item.name}: ${error.message}`}${colors.reset}`);
    }
      }
    }
  };
  

  const commandsDir = path.resolve(__dirname, config.commandsDir);
  loadCommandsFromDir(commandsDir);
  const lang = getLangSync();
  console.log(`${colors.cyan}[ COMMANDS ]${colors.reset} ${colors.green}${lang.console?.bot?.commandsLoaded?.replace('{count}', client.commands.size) || `Total Commands Loaded: ${client.commands.size}`}${colors.reset}`);
};

loadCommands();


// Discord client error handlers and reconnection logic
client.on("error", (error) => {
    const lang = getLangSync();
    console.error(`${colors.cyan}[ CLIENT ]${colors.reset} ${colors.red}${lang.console?.bot?.clientError || 'Discord Client Error:'}${colors.reset}`, error);
});

client.on("warn", (warning) => {
    const lang = getLangSync();
    console.warn(`${colors.cyan}[ CLIENT ]${colors.reset} ${colors.yellow}${lang.console?.bot?.clientWarning || 'Discord Client Warning:'}${colors.reset}`, warning);
});

client.on("shardError", (error, shardId) => {
    const lang = getLangSync();
    console.error(`${colors.cyan}[ SHARD ]${colors.reset} ${colors.red}Shard ${shardId} error:${colors.reset}`, error);
});

client.on("shardDisconnect", (event, shardId) => {
    const lang = getLangSync();
    console.warn(`${colors.cyan}[ SHARD ]${colors.reset} ${colors.yellow}Shard ${shardId} disconnected (code: ${event.code}, reason: ${event.reason || 'Unknown'})${colors.reset}`);
});

client.on("shardReconnecting", (shardId) => {
    const lang = getLangSync();
    console.log(`${colors.cyan}[ SHARD ]${colors.reset} ${colors.green}Shard ${shardId} reconnecting...${colors.reset}`);
});

client.on("shardResume", (shardId, replayed) => {
    const lang = getLangSync();
    console.log(`${colors.cyan}[ SHARD ]${colors.reset} ${colors.green}Shard ${shardId} resumed (${replayed} events replayed)${colors.reset}`);
});

// Keep-alive mechanism to prevent timeouts
let keepAliveInterval = null;
let lastActivity = Date.now();

client.on("ready", () => {
    // Reset activity timestamp
    lastActivity = Date.now();
    
    // Start keep-alive interval (every 5 minutes)
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(() => {
        try {
            // Check if client is still connected
            if (client.isReady() && client.ws.status === 0) {
                lastActivity = Date.now();
                // Perform a lightweight operation to keep connection alive
                client.guilds.cache.size; // Access cache to keep connection active
            } else {
                const lang = getLangSync();
                console.warn(`${colors.cyan}[ KEEP-ALIVE ]${colors.reset} ${colors.yellow}Client connection may be lost, attempting recovery...${colors.reset}`);
                // Attempt to reconnect if connection is lost
                if (!client.isReady()) {
                    client.login(config.TOKEN || process.env.TOKEN).catch(err => {
                        console.error(`${colors.cyan}[ KEEP-ALIVE ]${colors.reset} ${colors.red}Failed to reconnect:${colors.reset}`, err.message);
                    });
                }
            }
        } catch (error) {
            console.error(`${colors.cyan}[ KEEP-ALIVE ]${colors.reset} ${colors.red}Keep-alive error:${colors.reset}`, error.message);
        }
    }, 5 * 60 * 1000); // 5 minutes
});

// Monitor voice connections
let voiceConnectionMonitor = null;
client.on("ready", () => {
    if (voiceConnectionMonitor) clearInterval(voiceConnectionMonitor);
    voiceConnectionMonitor = setInterval(() => {
        try {
            if (!client.riffy) return;
            
            const players = client.riffy.players;
            if (!players || players.size === 0) return;
            
            // Check each player's connection
            for (const [guildId, player] of players) {
                try {
                    if (!player || player.destroyed) continue;
                    
                    const guild = client.guilds.cache.get(guildId);
                    if (!guild) {
                        // Guild not found, destroy player
                        player.destroy().catch(() => {});
                        continue;
                    }
                    
                    const voiceChannel = guild.channels.cache.get(player.voiceChannel);
                    if (!voiceChannel) {
                        // Voice channel not found, destroy player
                        player.destroy().catch(() => {});
                        continue;
                    }
                    
                    // Check if bot is still in the voice channel
                    const member = guild.members.me;
                    if (!member || !member.voice.channel || member.voice.channel.id !== voiceChannel.id) {
                        // Bot is not in the voice channel, destroy player
                        player.destroy().catch(() => {});
                    }
                } catch (error) {
                    console.warn(`${colors.cyan}[ VOICE-MONITOR ]${colors.reset} ${colors.yellow}Error monitoring player for guild ${guildId}:${colors.reset}`, error.message);
                }
            }
        } catch (error) {
            console.error(`${colors.cyan}[ VOICE-MONITOR ]${colors.reset} ${colors.red}Voice connection monitor error:${colors.reset}`, error.message);
        }
    }, 60000); // Check every minute
});

// Graceful shutdown handlers for Render.com
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    const lang = getLangSync();
    console.log(`\n${colors.cyan}[ SHUTDOWN ]${colors.reset} ${colors.yellow}Received ${signal}, shutting down gracefully...${colors.reset}`);
    
    try {
        // Clear intervals
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
        }
        if (voiceConnectionMonitor) {
            clearInterval(voiceConnectionMonitor);
            voiceConnectionMonitor = null;
        }
        
        // Destroy all players
        if (client.riffy && client.riffy.players) {
            for (const [guildId, player] of client.riffy.players) {
                try {
                    if (player && !player.destroyed) {
                        player.destroy();
                    }
                } catch (error) {
                    // Ignore errors during shutdown
                }
            }
        }
        
        // Destroy lavalink manager
        const nodeManager = getLavalinkManager();
        if (nodeManager) {
            nodeManager.destroy();
        }
        
        // Destroy Discord client
        if (client && !client.destroyed) {
            client.destroy();
        }
        
        console.log(`${colors.cyan}[ SHUTDOWN ]${colors.reset} ${colors.green}Graceful shutdown completed${colors.reset}`);
        process.exit(0);
    } catch (error) {
        console.error(`${colors.cyan}[ SHUTDOWN ]${colors.reset} ${colors.red}Error during shutdown:${colors.reset}`, error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Single uncaughtException handler: filter known Riffy/thumbnail noise, log rest without exiting
process.on('uncaughtException', (error) => {
    const lang = getLangSync();
    if (error?.message && (
        error.message.includes('Cannot read properties of null') ||
        error.message.includes('track.info') ||
        error.message.includes('thumbnail')
    )) {
        console.warn(lang.console?.bot?.riffyThumbnailError?.replace('{message}', error.message) || `[ Riffy ] Ignoring thumbnail error: ${error.message}`);
        return;
    }
    console.error(`${colors.cyan}[ CRITICAL ]${colors.reset} ${colors.red}Uncaught Exception:${colors.reset}`, error);
});

client.on("raw", (d) => {
    const { GatewayDispatchEvents } = require("discord.js");
    if (![GatewayDispatchEvents.VoiceStateUpdate, GatewayDispatchEvents.VoiceServerUpdate].includes(d.t)) return;
    if (client.riffy) {
        client.riffy.updateVoiceState(d);
    }
});

client.login(config.TOKEN || process.env.TOKEN).catch((e) => {
  const lang = getLangSync();
  console.log('\n' + '─'.repeat(40));
  console.log(`${colors.magenta}${colors.bright}${lang.console?.bot?.tokenVerification || '🔐 TOKEN VERIFICATION'}${colors.reset}`);
  console.log('─'.repeat(40));
  console.log(`${colors.cyan}[ TOKEN ]${colors.reset} ${colors.red}${lang.console?.bot?.tokenAuthFailed || 'Authentication Failed ❌'}${colors.reset}`);
  console.log(`${colors.gray}${lang.console?.bot?.tokenError || 'Error: Turn On Intents or Reset New Token'}${colors.reset}`);
});
connectToDatabase().then(() => {
  const lang = getLangSync();
  console.log(`${colors.cyan}[ DATABASE ]${colors.reset} ${colors.green}${lang.console?.bot?.databaseOnline || 'MongoDB Online ✅'}${colors.reset}`);
}).catch((err) => {
  const lang = getLangSync();
  console.log('\n' + '─'.repeat(40));
  console.log(`${colors.magenta}${colors.bright}${lang.console?.bot?.databaseStatus || '🕸️  DATABASE STATUS'}${colors.reset}`);
  console.log('─'.repeat(40));
  console.log(`${colors.cyan}[ DATABASE ]${colors.reset} ${colors.red}${lang.console?.bot?.databaseFailed || 'Connection Failed ❌'}${colors.reset}`);
  console.log(`${colors.gray}${lang.console?.bot?.databaseError?.replace('{message}', err.message) || `Error: ${err.message}`}${colors.reset}`);
});
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// Enhanced health check endpoint for Render.com
app.get('/health', (req, res) => {
    try {
        const isReady = client.isReady();
        const wsStatus = client.ws ? client.ws.status : -1;
        const wsPing = client.ws ? client.ws.ping : -1;
        const guildCount = client.guilds ? client.guilds.cache.size : 0;
        const userCount = client.users ? client.users.cache.size : 0;
        
        // Check Lavalink connection
        let lavalinkStatus = 'unknown';
        let connectedNodes = 0;
        let totalNodes = 0;
        try {
            const nodeManager = getLavalinkManager();
            if (nodeManager) {
                connectedNodes = nodeManager.getConnectedNodeCount();
                totalNodes = nodeManager.getTotalNodeCount();
                lavalinkStatus = connectedNodes > 0 ? 'connected' : 'disconnected';
            }
        } catch (error) {
            lavalinkStatus = 'error';
        }
        
        // Check memory usage
        const memoryUsage = process.memoryUsage();
        const memoryMB = {
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024)
        };
        
        const healthStatus = isReady && wsStatus === 0 ? 'healthy' : 'degraded';
        const statusCode = healthStatus === 'healthy' ? 200 : 503;
        
        res.status(statusCode).json({ 
            status: healthStatus,
            discord: {
                ready: isReady,
                wsStatus: wsStatus,
                ping: wsPing,
                guilds: guildCount,
                users: userCount
            },
            lavalink: {
                status: lavalinkStatus,
                connectedNodes: connectedNodes,
                totalNodes: totalNodes
            },
            memory: memoryMB,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/', (req, res) => {
    const imagePath = path.join(__dirname, 'index.html');
    // If index.html doesn't exist, send a simple response
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.json({ 
            message: 'Prime Music Bot is running!',
            status: 'online',
            version: '1.4'
        });
    }
});

app.listen(port, () => {
    console.log('\n' + '─'.repeat(40));
    console.log(`${colors.magenta}${colors.bright}🌐 SERVER STATUS${colors.reset}`);
    console.log('─'.repeat(40));
    console.log(`${colors.cyan}[ SERVER ]${colors.reset} ${colors.green}Online ✅${colors.reset}`);
    console.log(`${colors.cyan}[ PORT ]${colors.reset} ${colors.yellow}${port}${colors.reset}`);
    console.log(`${colors.cyan}[ TIME ]${colors.reset} ${colors.gray}${new Date().toISOString().replace('T', ' ').split('.')[0]}${colors.reset}`);
    console.log(`${colors.cyan}[ USER ]${colors.reset} ${colors.yellow}GlaceYT${colors.reset}`);
});

