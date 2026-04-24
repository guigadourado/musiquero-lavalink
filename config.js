

module.exports = {
  TOKEN: "",
  language: "en",
  ownerID: ["1004206704994566164", ""],
  mongodbUri : "mongodb+srv://shiva:shiva@musicbotyt.ouljywv.mongodb.net/?retryWrites=true&w=majority",
  spotifyClientId : "d92baed9605a45a39ed7c2a2d960b1c1",
  spotifyClientSecret : "e9b29f6739de4315bc03b6d8a8e93b03",
  setupFilePath: './commands/setup.json',
  commandsDir: './commands',  
  embedColor: "#1db954",
  musicChannelId: "1449954292441288825",  // Restrict music slash commands to this channel (null = any channel)
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
    {
      name: "Serenetia V4",
      password: "https://dsc.gg/ajidevserver",
      host: "lavalinkv4.serenetia.com",
      port: 443,
      secure: true
    },
    {
      name: "Serenetia V3/V4",
      password: "https://dsc.gg/ajidevserver",
      host: "lavalink.serenetia.com",
      port: 443,
      secure: true
    },
    {
      name: "Jirayu",
      password: "youshallnotpass",
      host: "lavalink.jirayu.net",
      port: 443,
      secure: true
    },
    {
      name: "GlaceYT",
      password: "glace",
      host: "de-01.strixnodes.com",
      port: 2010,
      secure: false
    },
    {
      name: "Mart",
      password: "D-Radio",
      host: "162.19.133.164",
      port: 7918,
      secure: false
    },
    {
      name: "Friston",
      password: "Secure@Friston",
      host: "185.211.103.215",
      port: 6873,
      secure: false
    }
  ]
}
