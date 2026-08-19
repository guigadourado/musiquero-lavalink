

module.exports = {
  TOKEN: "",
  language: "en",
  ownerID: [],
  mongodbUri : "mongodb+srv://guigadourado_db_user:BeYNlyzlrPR9ncV9@cluster0.ny96khn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
  spotifyClientId : "d92baed9605a45a39ed7c2a2d960b1c1",
  spotifyClientSecret : "e9b29f6739de4315bc03b6d8a8e93b03",
  setupFilePath: './commands/setup.json',
  commandsDir: './commands',  
  embedColor: "#1db954",
  musicChannelId: "1449954292441288825",  // Restrict music slash commands to this channel (null = any channel)
  autoPlayChannels: ["1449954292441288825"],  // Messages typed in these channels trigger /play automatically
  customEmoji: true,  // true = use custom emoji IDs from emoji.js, false = use default unicode
  emojiTheme: "redwhite", // active custom emoji theme key in emoji.js
  helpBannerUrl: "https://i.ibb.co/GfTxbJfC/7-edited.png", // Optional: set a direct image URL to show an inline banner in /help
  activityName: "YouTube Music", 
  activityType: "LISTENING",  // Available activity types : LISTENING , PLAYING
  SupportServer: "https://discord.gg/xQF9f9yUEM",
  embedTimeout: 5,
  showProgressBar: false,  // Show progress bar in track embed
  showVisualizer: false,  // Show visualizer on music card (disabled for low-memory optimization)
  generateSongCard: true,  // custom song card image, if false uses thumbnail
  metadataTag: true,  // If true, always show Song Details even when the card image is present
  lowMemoryMode: true,   // Performance optimizations for low-memory environments (512MB RAM)
  errorLog: "", 
  nodes: [
    // ✅ Verified online — last checked 2026-08-19
    {
      name: "Serenetia",
      password: "https://dsc.gg/ajidevserver",
      host: "lavalink.serenetia.com",
      port: 443,
      secure: true
    },
    {
      name: "Serenetia NonSSL",
      password: "https://seretia.link/discord",
      host: "lavalinkv4.serenetia.com",
      port: 80,
      secure: false
    },
    {
      name: "GlaceYT",
      password: "glace",
      host: "de-01.strixnodes.com",
      port: 2010,
      secure: false
    },
    {
      name: "GlaceYT-2",
      password: "glace",
      host: "de-01.strixnodes.com",
      port: 2028,
      secure: false
    },
    {
      name: "Jirayu",
      password: "youshallnotpass",
      host: "lavalink.jirayu.net",
      port: 13592,
      secure: false
    },
    {
      name: "Kasawa",
      password: "youshallnotpass",
      host: "lava2.kasawa.pro",
      port: 2334,
      secure: false
    },
  ]
}
