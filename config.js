

module.exports = {
  TOKEN: "",
  language: "en",
  ownerID: ["1004206704994566164", ""], 
  mongodbUri : "mongodb+srv://shiva:shiva@musicbotyt.ouljywv.mongodb.net/?retryWrites=true&w=majority",
  // Spotify credentials - supports multiple sets for load balancing and fallback
  spotifyCredentials: [
    {
      clientId: "d92baed9605a45a39ed7c2a2d960b1c1",
      clientSecret: "e9b29f6739de4315bc03b6d8a8e93b03"
    },
    {
      clientId: "85aab1d51a174aad9eed6d7989f530e6",
      clientSecret: "b2ad05aa725e434c88776a1be8eab6c2"
    },
    {
      clientId: "f71a3da30e254962965ca2a89d6f74b9",
      clientSecret: "199a619d22dd4e55a4a2c1a7a3d70e63"
    }
  ],
  // Legacy support - uses first credential set
  spotifyClientId : "d92baed9605a45a39ed7c2a2d960b1c1",
  spotifyClientSecret : "e9b29f6739de4315bc03b6d8a8e93b03",
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
    }
    // The bot will automatically use the first available node
    // Automatic failover to next node if one goes down
  ]
}
