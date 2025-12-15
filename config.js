require('dotenv').config();

function parseCsv(value) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function parseNodesFromEnv() {
  const raw = process.env.LAVALINK_NODES_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

const envNodes = parseNodesFromEnv();

module.exports = {
  // Secrets: prefer env vars, keep empty defaults in repo
  TOKEN: process.env.TOKEN || "",
  mongodbUri: process.env.MONGODB_URI || "",
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID || "",
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",

  language: process.env.BOT_LANGUAGE || "en",
  ownerID: parseCsv(process.env.OWNER_IDS).length ? parseCsv(process.env.OWNER_IDS) : [],

  setupFilePath: './commands/setup.json',
  commandsDir: './commands',

  embedColor: process.env.EMBED_COLOR || "#1db954",
  activityName: process.env.ACTIVITY_NAME || "YouTube Music",
  activityType: process.env.ACTIVITY_TYPE || "LISTENING", // LISTENING , PLAYING
  SupportServer: process.env.SUPPORT_SERVER || "https://discord.gg/xQF9f9yUEM",

  embedTimeout: Number(process.env.EMBED_TIMEOUT || 5),
  showProgressBar: process.env.SHOW_PROGRESS_BAR === 'true' ? true : false,
  showVisualizer: process.env.SHOW_VISUALIZER === 'true' ? true : false,
  generateSongCard: process.env.GENERATE_SONG_CARD === 'false' ? false : true,

  // Performance optimizations for low-memory environments (512MB RAM)
  lowMemoryMode: process.env.LOW_MEMORY_MODE === 'false' ? false : true,
  errorLog: process.env.ERROR_LOG || "",

  // Lavalink
  // - Configure here OR provide `LAVALINK_NODES_JSON` env var with an array of nodes.
  nodes: envNodes || [
    {
      name: "local",
      password: "youshallnotpass",
      host: "localhost",
      port: 2333,
      secure: false
    }
  ]
};
