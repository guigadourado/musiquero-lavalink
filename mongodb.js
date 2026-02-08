const { MongoClient } = require('mongodb');
const colors = require('./UI/colors/colors');
const config = require("./config.js");
require('dotenv').config();

let client; 

if (config.mongodbUri) {
    const uri = config.mongodbUri;
    client = new MongoClient(uri);
} else {
    try {
        const { getLangSync } = require('./utils/languageLoader.js');
        const lang = getLangSync();
        console.warn("\x1b[33m[ WARNING ]\x1b[0m " + (lang.console?.mongodb?.uriNotDefined || "MongoDB URI is not defined in the configuration."));
    } catch (e) {
        console.warn("\x1b[33m[ WARNING ]\x1b[0m MongoDB URI is not defined in the configuration.");
    }
}

async function connectToDatabase() {
    try {
        const { getLangSync } = require('./utils/languageLoader.js');
        const lang = getLangSync();
        if (!client) {
            console.warn("\x1b[33m[ WARNING ]\x1b[0m " + (lang.console?.mongodb?.skippingConnection || "Skipping MongoDB connection as URI is not provided."));
            return;
        }

        try {
            await client.connect();
            console.log('\n' + '─'.repeat(40));
            console.log(`${colors.magenta}${colors.bright}${lang.console?.bot?.databaseConnection || '🕸️  DATABASE CONNECTION'}${colors.reset}`);
            console.log('─'.repeat(40));
            console.log('\x1b[36m[ DATABASE ]\x1b[0m', '\x1b[32m' + (lang.console?.mongodb?.connected || 'Connected to MongoDB ✅') + '\x1b[0m');
        } catch (err) {
            console.warn("\x1b[33m[ WARNING ]\x1b[0m " + (lang.console?.mongodb?.connectionFailed || "Could not connect to MongoDB. Continuing without database functionality."));
            console.error(err.message);
        }
    } catch (e) {
        if (!client) {
            console.warn("\x1b[33m[ WARNING ]\x1b[0m Skipping MongoDB connection as URI is not provided.");
            return;
        }
        try {
            await client.connect();
            console.log('\n' + '─'.repeat(40));
            console.log(`${colors.magenta}${colors.bright}🕸️  DATABASE CONNECTION${colors.reset}`);
            console.log('─'.repeat(40));
            console.log('\x1b[36m[ DATABASE ]\x1b[0m', '\x1b[32mConnected to MongoDB ✅\x1b[0m');
        } catch (err) {
            console.warn("\x1b[33m[ WARNING ]\x1b[0m Could not connect to MongoDB. Continuing without database functionality.");
            console.error(err.message);
        }
    }
}

const db = client ? client.db("PrimeMusicSSRR") : null;
const playlistCollection = db ? db.collection("SongPlayLists") : null;
const autoplayCollection = db ? db.collection("AutoplaySettings") : null;
const languageCollection = db ? db.collection("GuildLanguages") : null;

// In-memory fallback for autoplay/24/7 when MongoDB is not available (default: both true)
const autoplayMemory = new Map();

async function getAutoplaySettings(guildId) {
    const id = String(guildId);
    if (autoplayCollection) {
        try {
            const doc = await autoplayCollection.findOne({ guildId: id }).catch(() => null);
            return {
                autoplay: doc?.autoplay !== false,
                twentyfourseven: doc?.twentyfourseven !== false,
            };
        } catch (_) {}
    }
    const mem = autoplayMemory.get(id);
    return {
        autoplay: mem?.autoplay !== false,
        twentyfourseven: mem?.twentyfourseven !== false,
    };
}

async function setAutoplaySettings(guildId, updates) {
    const id = String(guildId);
    const mem = autoplayMemory.get(id) || { autoplay: true, twentyfourseven: true };
    if (updates.autoplay !== undefined) mem.autoplay = updates.autoplay;
    if (updates.twentyfourseven !== undefined) mem.twentyfourseven = updates.twentyfourseven;
    autoplayMemory.set(id, mem);
    if (autoplayCollection) {
        try {
            await autoplayCollection.updateOne(
                { guildId: id },
                { $set: mem },
                { upsert: true }
            );
        } catch (_) {}
    }
}

function getLanguageCollection() {
    return languageCollection;
}

module.exports = {
    connectToDatabase,
    playlistCollection,
    autoplayCollection,
    getAutoplaySettings,
    setAutoplaySettings,
    getLanguageCollection,
};
