// Prefer env vars for secrets (see .env.example). Fallbacks keep existing behavior.
require("dotenv").config();

const spotifyClientId = process.env.SPOTIFY_CLIENT_ID || "d92baed9605a45a39ed7c2a2d960b1c1";
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET || "e9b29f6739de4315bc03b6d8a8e93b03";

module.exports = {
  TOKEN: process.env.TOKEN || "",
  language: "en",
  ownerID: ["1004206704994566164", ""],
  mongodbUri: process.env.MONGODB_URI || "mongodb+srv://shiva:shiva@musicbotyt.ouljywv.mongodb.net/?retryWrites=true&w=majority",
  // Spotify credentials - supports multiple sets for load balancing and fallback
  spotifyCredentials: [
    { clientId: spotifyClientId, clientSecret: spotifyClientSecret },
    {
      clientId: "85aab1d51a174aad9eed6d7989f530e6",
      clientSecret: "b2ad05aa725e434c88776a1be8eab6c2"
    },
    {
      clientId: "f71a3da30e254962965ca2a89d6f74b9",
      clientSecret: "199a619d22dd4e55a4a2c1a7a3d70e63"
    }
  ],
  // Legacy support - uses first credential set (from env or above)
  spotifyClientId,
  spotifyClientSecret,
  setupFilePath: './commands/setup.json',
  commandsDir: './commands',  
  embedColor: "#1db954",
  activityName: "YouTube Music", 
  activityType: "LISTENING",  // Available activity types : LISTENING , PLAYING
  SupportServer: "https://discord.gg/xQF9f9yUEM",
  embedTimeout: 5,
  showProgressBar: false,  // Show progress bar in track embed
  showVisualizer: false,  // Show visualizer on music card (disabled for low-memory optimization)
  generateSongCard: true,  // custom song card image, if false uses thumbnail
  // Performance optimizations for low-memory environments (256MB/512MB RAM)
  lowMemoryMode: true,  // Enable optimizations for low-memory hosting (tested on OpenBotHost)
  errorLog: "",
  // Spotify playlist limits for memory efficiency
  spotifyPlaylistLimit: 150,  // Maximum tracks to load from Spotify playlists (reduces memory usage)
  // Auto-play channels: Messages in these channels will be treated as play commands
  // Set to [] to disable, or add channel IDs/names (e.g., ["music", "123456789012345678"])
  autoPlayChannels: ["1449954292441288825"],  // Channel ID - messages here will auto-play
  // Music commands channel: Music commands can only be used in this channel
  // Set to null or empty string to allow music commands in any channel
  musicChannelId: "1449954292441288825",  // Channel ID - music commands restricted to this channel 
  // Lavalink v4 nodes; see docs/LAVALINK_NODES.md for thread-sourced list
  nodes: [
    {
      name: "AYANO LAVA",
      password: "AYANO",
      host: "194.58.66.44",
      port: 3660,
      secure: false
    },
    {
      name: "Harmonix V4",
      password: "Kaun.Yuvraj",
      host: "pnode1.danbot.host",
      port: 1186,
      secure: false
    },
    {
      name: "Voidhosting",
      password: "cocaine",
      host: "nexus.voidhosting.vip",
      port: 6004,
      secure: false
    },
    {
      name: "GlceYT",
      password: "glace",
      host: "us-01.strixnodes.com",
      port: 8003,
      secure: false
    },
    {
      name: "DEVINE PRO",
      password: "Devine",
      host: "top.kyrahost.xyz",
      port: 2010,
      secure: false
    },
    {
      name: "D-Radio",
      password: "KaAs",
      host: "ishaan.hidencloud.com",
      port: 24590,
      secure: false
    },
    {
      name: "prmgvyt",
      password: "prmgvyt",
      host: "217.160.125.127",
      port: 14845,
      secure: false
    },
    {
      name: "Lunarnode",
      password: "youshallnotpass",
      host: "in1.lunarnode.xyz",
      port: 2993,
      secure: false
    }
    // More nodes from thread: see docs/LAVALINK_NODES.md
    // Yumi (Ariato!) - temporarily down, uncomment when host is back:
    // { name: "Yumi", password: "Sakura", host: "TBD", port: 2333, secure: false },
    // The bot will automatically use the first available node
    // Automatic failover to next node if one goes down
  ]
}
