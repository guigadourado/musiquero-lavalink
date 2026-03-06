const { Client, GatewayIntentBits } = require("discord.js");
const config = require("./config.js");
const fs = require("fs");
const path = require('path');
const { initializePlayer } = require('./player');
const { connectToDatabase } = require('./mongodb');
const colors = require('./UI/colors/colors');
const { getLang, getLangSync } = require('./utils/languageLoader.js');
require('dotenv').config();

const client = new Client({
    intents: Object.keys(GatewayIntentBits).map(a => GatewayIntentBits[a]),
});

client.config = config;

process.on('unhandledRejection', (error) => {
    const lang = getLangSync();
    if (error?.message?.includes('Cannot read properties of null') ||
        error?.message?.includes('thumbnail')) {
        return;
    }
    console.error(lang.console?.bot?.unhandledRejection || 'Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error(`${colors.cyan}[ CRITICAL ]${colors.reset} ${colors.red}Uncaught Exception:${colors.reset}`, error);
});

initializePlayer(client).catch(error => {
    console.error(`${colors.cyan}[ DISTUBE ]${colors.reset} ${colors.red}Error initializing player: ${error.message}${colors.reset}`);
});

client.on("clientReady", () => {
    const lang = getLangSync();
    console.log(`${colors.cyan}[ SYSTEM ]${colors.reset} ${colors.green}${lang.console?.bot?.clientLogged?.replace('{tag}', client.user.tag) || `Client logged as ${client.user.tag}`}${colors.reset}`);
    console.log(`${colors.cyan}[ MUSIC ]${colors.reset} ${colors.green}DisTube Music System Ready 🎵${colors.reset}`);
});

fs.readdir("./events", (_err, files) => {
    files.forEach((file) => {
        if (!file.endsWith(".js")) return;
        const event = require(`./events/${file}`);
        const eventName = file.split(".")[0];
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
                    const command = require(path.resolve(fullPath));
                    if (command.data && command.run) {
                        client.commands.set(command.data.name, command);
                        client.commandsArray.push(command.data.toJSON());
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

client.on("error", (error) => {
    const lang = getLangSync();
    console.error(`${colors.cyan}[ CLIENT ]${colors.reset} ${colors.red}${lang.console?.bot?.clientError || 'Discord Client Error:'}${colors.reset}`, error);
});

client.on("warn", (warning) => {
    const lang = getLangSync();
    console.warn(`${colors.cyan}[ CLIENT ]${colors.reset} ${colors.yellow}${lang.console?.bot?.clientWarning || 'Discord Client Warning:'}${colors.reset}`, warning);
});

// Keep-alive
let keepAliveInterval = null;
client.on("ready", () => {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(() => {
        try {
            if (!client.isReady()) {
                client.login(config.TOKEN || process.env.TOKEN).catch(err => {
                    console.error(`${colors.cyan}[ KEEP-ALIVE ]${colors.reset} ${colors.red}Failed to reconnect:${colors.reset}`, err.message);
                });
            }
        } catch (error) {
            console.error(`${colors.cyan}[ KEEP-ALIVE ]${colors.reset} ${colors.red}Keep-alive error:${colors.reset}`, error.message);
        }
    }, 5 * 60 * 1000);
});

// Graceful shutdown
let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n${colors.cyan}[ SHUTDOWN ]${colors.reset} ${colors.yellow}Received ${signal}, shutting down gracefully...${colors.reset}`);
    try {
        if (keepAliveInterval) { clearInterval(keepAliveInterval); keepAliveInterval = null; }
        if (client.distube) {
            for (const [guildId] of client.distube.queues) {
                try { client.distube.stop(client.guilds.cache.get(guildId)?.members.me?.voice.channel); } catch { /* ignore */ }
            }
        }
        if (client && !client.destroyed) client.destroy();
        console.log(`${colors.cyan}[ SHUTDOWN ]${colors.reset} ${colors.green}Graceful shutdown completed${colors.reset}`);
        process.exit(0);
    } catch (error) {
        console.error(`${colors.cyan}[ SHUTDOWN ]${colors.reset} ${colors.red}Error during shutdown:${colors.reset}`, error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

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

app.get('/health', (req, res) => {
    try {
        const isReady   = client.isReady();
        const wsStatus  = client.ws?.status ?? -1;
        const memUsage  = process.memoryUsage();
        const memMB     = {
            rss:       Math.round(memUsage.rss       / 1024 / 1024),
            heapUsed:  Math.round(memUsage.heapUsed  / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        };
        const healthStatus = isReady && wsStatus === 0 ? 'healthy' : 'degraded';
        res.status(healthStatus === 'healthy' ? 200 : 503).json({
            status: healthStatus,
            discord: { ready: isReady, wsStatus, ping: client.ws?.ping, guilds: client.guilds?.cache.size },
            music: { engine: 'DisTube', activeQueues: client.distube?.queues?.size ?? 0 },
            memory: memMB,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(503).json({ status: 'error', error: error.message, timestamp: new Date().toISOString() });
    }
});

app.get('/', (req, res) => {
    const imagePath = path.join(__dirname, 'index.html');
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.json({ message: 'Prime Music Bot is running!', status: 'online', version: '2.0', engine: 'DisTube' });
    }
});

app.listen(port, () => {
    console.log('\n' + '─'.repeat(40));
    console.log(`${colors.magenta}${colors.bright}🌐 SERVER STATUS${colors.reset}`);
    console.log('─'.repeat(40));
    console.log(`${colors.cyan}[ SERVER ]${colors.reset} ${colors.green}Online ✅${colors.reset}`);
    console.log(`${colors.cyan}[ PORT ]${colors.reset}   ${colors.yellow}${port}${colors.reset}`);
    console.log(`${colors.cyan}[ ENGINE ]${colors.reset} ${colors.yellow}DisTube${colors.reset}`);
    console.log('─'.repeat(40));
});
