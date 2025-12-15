<div align="center">

![Logo](https://i.ibb.co/GfTxbJfC/7-edited.png)

# 🎵 PrimeMusic - Advanced Lavalink Music Bot

![Version](https://img.shields.io/badge/version-1.4-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![Discord.js](https://img.shields.io/badge/discord.js-14.25.1-blue.svg)

**A feature-rich, high-performance Discord music bot built with Lavalink and Discord.js v2 Components**

---

### 🔗 Connect With Me

[![YouTube](https://img.shields.io/badge/YouTube-GlaceYT-red?style=for-the-badge&logo=youtube)](https://youtube.com/@GlaceYT)
[![Website](https://img.shields.io/badge/Website-GlaceYT.com-blue?style=for-the-badge&logo=google-chrome)](https://glaceyt.com)
[![Replit](https://img.shields.io/badge/Replit-GlaceYT-orange?style=for-the-badge&logo=replit)](https://replit.com/@GlaceYT)
[![Discord](https://img.shields.io/badge/Discord-Support%20Server-5865F2?style=for-the-badge&logo=discord)](https://discord.gg/xQF9f9yUEM)

---

[Features](#-features) • [Installation](#-installation) • [Configuration](#-configuration) • [Usage](#-usage) • [Support](#-support)

</div>

---

## ✨ Features

### 🎶 Music Features
- **Multi-Platform Support**: YouTube, SoundCloud, Spotify (links, text search, and playlists)
- **High-Quality Audio**: Optimized for smooth playback even on low-memory hosting (256MB/512MB+)
- **Queue Management**: Advanced queue system with shuffle, loop, and clear options
- **Playlist Support**: Create, save, and manage custom playlists
- **Enhanced Autoplay**: Improved autoplay system for continuous music
- **24/7 Mode**: Keep the bot in voice channels 24/7
- **New Search Command**: Better search functionality
- **Music Cards**: Beautiful custom-generated music cards with thumbnails
- **Live Lyrics**: Real-time synchronized lyrics display
- **Track History**: Automatic history tracking for played songs

### 🎨 User Experience
- **Multi-Language Support**: 7 languages available (up to 25 languages planned)
- **Interactive Controls**: Discord v2 Components - Modern button-based controls
- **Progress Tracking**: Real-time progress bars and track information
- **Visual Feedback**: Professional embeds and status updates
- **Error Handling**: Graceful error handling with user-friendly messages
- **Console Translation**: Full bot translation including console logs for users and developers

### ⚡ Performance Optimizations
- **Low-Memory Mode**: Optimized for hosting environments with limited RAM (256MB/512MB+)
- **Efficient Updates**: Reduced update frequencies to minimize CPU/memory usage
- **Smart Caching**: Optimized thumbnail fetching with fallback systems
- **Resource Management**: Automatic cleanup and memory optimization
- **Tested & Verified**: Tested on OpenBotHost hosting platform, optimized for low-RAM plans

### 🛠️ Advanced Features
- **Filter System**: Multiple audio filters (bassboost, nightcore, karaoke, etc.)
- **Volume Control**: Precise volume adjustment (10-100%)
- **Seek Functionality**: Jump to specific positions in tracks
- **Vote Skip**: Democratic skip system for queue management
- **Track Info**: Detailed track information display
- **Auto Node Connection Retry [Beta]**: Automatic reconnection to Lavalink nodes
- **Enhanced Autoplay**: Improved autoplay system for continuous music

---

## 📋 Requirements

- **Node.js**: v16.0.0 or higher
- **Discord Bot Token**: Get one from [Discord Developer Portal](https://discord.com/developers/applications)
- **Lavalink Server**: Self-hosted or use a public Lavalink node
- **MongoDB Database**: For playlist and history storage
- **Spotify API** (Optional): For Spotify support

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/GlaceYT/PrimeMusic-Lavalink.git
cd PrimeMusic-Lavalink
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in the root directory:
```env
TOKEN=your_discord_bot_token_here
```

### 4. Configure `config.js`

Edit `config.js` with your settings:

```javascript
module.exports = {
  TOKEN: "", // Leave empty if using .env file
  language: "en",
  ownerID: ["your_user_id_here"],
  mongodbUri: "your_mongodb_connection_string",
  spotifyClientId: "your_spotify_client_id", // Optional
  spotifyClientSecret: "your_spotify_client_secret", // Optional
  nodes: [
     {
            name: "AYANO LAVA",
            password: "AYANO",
            host: "194.58.66.44",
            port: 3660,
            secure: false
    }
  ]
  
  // Or use any public Lavalink node from your Lavalink provider
}
```

**Note**: The bot includes Auto Node Connection Retry [Beta] - it will automatically reconnect to Lavalink nodes if they disconnect.

### 5. Enable Discord Intents

In the [Discord Developer Portal](https://discord.com/developers/applications):
- Go to your bot application
- Navigate to **Bot** → **Privileged Gateway Intents**
- Enable:
  - ✅ **MESSAGE CONTENT INTENT**
  - ✅ **SERVER MEMBERS INTENT**

### 6. Run the Bot
```bash
npm start
```

---

## 🚀 Deploy to Render.com

### Quick Deploy

1. **Fork/Clone this repository** to your GitHub account

2. **Create a new Web Service on Render.com**:
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure the service**:
   - **Name**: `prime-music-bot` (or any name you prefer)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better performance)

4. **Set Environment Variables**:
   Click "Environment" and add:
   ```
   TOKEN=your_discord_bot_token_here
   NODE_ENV=production
   ```
   
   Optional (if using env vars instead of config.js):
   ```
   MONGODB_URI=your_mongodb_connection_string
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   ```

5. **Configure in config.js**:
   - Edit `config.js` with your MongoDB URI, Spotify credentials, and Lavalink node settings
   - Set `TOKEN: ""` in config.js (it will use the TOKEN from environment variable)

6. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically build and deploy your bot
   - Monitor the logs to ensure it starts correctly

### Render.com Configuration Notes

- **Health Check**: The bot includes a `/health` endpoint for Render's health checks
- **Port**: The bot automatically uses Render's provided PORT (no configuration needed)
- **Free Tier**: The free tier spins down after 15 minutes of inactivity. Consider upgrading for 24/7 operation
- **Environment Variables**: Sensitive data should be stored in Render's environment variables, not in code

### Using render.yaml (Alternative Method)

You can also use the included `render.yaml` file for easier deployment:
1. Push this repository to GitHub
2. On Render Dashboard, click "New +" → "Blueprint"
3. Connect your repository
4. Render will automatically detect and use the `render.yaml` configuration

---

## ⚙️ Configuration

### Basic Settings

| Option | Description | Default |
|--------|-------------|---------|
| `TOKEN` | Discord bot token | `""` (use .env) |
| `language` | Default bot language | `"en"` |
| `ownerID` | Bot owner user IDs | `[]` |
| `mongodbUri` | MongoDB connection string | Required |
| `embedColor` | Embed accent color (hex) | `"#1db954"` |
| `activityName` | Bot activity text | `"YouTube Music"` |
| `activityType` | Activity type | `"LISTENING"` |

### Performance Settings

| Option | Description | Default |
|--------|-------------|---------|
| `lowMemoryMode` | Enable low-memory optimizations | `true` |
| `generateSongCard` | Generate custom music cards | `true` |
| `showVisualizer` | Show audio visualizer | `false` |
| `showProgressBar` | Show progress bar in embeds | `false` |

### Lavalink Nodes

Configure your Lavalink nodes in the `nodes` array:

```javascript
nodes: [
  {
    name: "NodeName",
    password: "youshallnotpass",
    host: "localhost",
    port: 2333,
    secure: false
  }
]
```

---

## 🎮 Usage

### Basic Commands

| Command | Description |
|---------|-------------|
| `/play <song>` | Play a song from YouTube, SoundCloud, or Spotify |
| `/pause` | Pause the current track |
| `/resume` | Resume the paused track |
| `/skip` | Skip to the next song |
| `/stop` | Stop playback and clear queue |
| `/queue` | View the current queue |
| `/volume <1-100>` | Adjust playback volume |
| `/nowplaying` | Show current track information |

### Advanced Commands

| Command | Description |
|---------|-------------|
| `/shuffle` | Shuffle the queue |
| `/loop` | Toggle loop mode (track/queue) |
| `/seek <time>` | Jump to a specific time in the track |
| `/filters` | Apply audio filters |
| `/autoplay` | Toggle autoplay mode |
| `/24/7` | Toggle 24/7 mode |
| `/playlist create <name>` | Create a custom playlist |
| `/playlist savequeue <name>` | Save current queue as playlist |

---

## 🌍 Supported Languages

The bot supports **7 languages** (up to 25 languages planned):

- 🇺🇸 English (en)
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇯🇵 Japanese (ja)
- 🇰🇷 Korean (ko)
- 🇷🇺 Russian (ru)

**Adding Your Own Language**: Add your own language in the `languages/` folder using `en.js` as a template, then use it in `config.js` or via `/language` command.

Change language with: `/language <language_code>`

---

## 🎵 Supported Platforms

- **YouTube** - Videos, playlists, and search
- **SoundCloud** - Tracks and playlists
- **Spotify** - Tracks, albums, and playlists (requires API credentials)

---

## ⚡ Performance Optimizations

This bot is optimized for low-memory hosting environments:

- **Reduced Update Frequency**: Progress updates every 15 seconds (instead of 5)
- **Smart Card Generation**: Music cards regenerate every 90 seconds
- **Efficient Health Checks**: Optimized monitoring intervals
- **Memory Management**: Automatic cleanup and resource optimization
- **Fast Thumbnail Fetching**: Direct YouTube URLs with fallback system
- **Low-Memory Mode**: Enabled by default for resource-constrained hosting

### Tested & Verified Hosting

- **Tested Platform**: OpenBotHost ([dash.openbot.host](https://dash.openbot.host/))
- **Optimized For**: 256MB / 512MB RAM
- **Low-Memory Mode**: Enabled for low-RAM plans

### Recommended Hosting Specs

- **Minimum**: 256MB RAM, 1 CPU core (tested and working)
- **Recommended**: 512MB+ RAM, 1+ CPU cores
- **Optimal**: 1GB+ RAM, 2+ CPU cores
- **Node.js**: v16.0.0 or higher

---

## 📁 Project Structure

```
PrimeMusic-Lavalink/
├── commands/          # Bot commands
│   ├── basic/         # Basic commands (help, ping, stats)
│   ├── music/         # Music commands (play, pause, skip)
│   ├── playlist/      # Playlist management
│   └── utility/       # Utility commands
├── events/            # Discord event handlers
├── languages/         # Language files
├── utils/             # Utility functions
│   ├── musicCard.js   # Music card generator
│   └── ...
├── UI/                # UI assets (icons, colors)
├── config.js          # Bot configuration
├── bot.js             # Main bot file
├── player.js          # Music player logic
├── lavalink.js        # Lavalink connection manager
└── index.js           # Entry point
```

---

## 🐛 Troubleshooting

### Bot doesn't respond to commands
- Check if bot has proper permissions
- Verify MESSAGE CONTENT INTENT is enabled
- Ensure bot is online and connected

### Music doesn't play
- Verify Lavalink node is running and accessible
- Check node configuration in `config.js`
- Ensure bot has permission to join voice channels
- Auto Node Connection Retry [Beta] will automatically attempt to reconnect if nodes disconnect

### Thumbnails not loading
- Bot will automatically use music icon placeholder
- Check internet connection for thumbnail fetching
- YouTube thumbnails are fetched automatically from track URI

### High memory usage
- `lowMemoryMode: true` is enabled by default (optimized for 256MB/512MB RAM)
- Disable `showVisualizer` if not needed (already disabled by default)
- Consider using `generateSongCard: false` for minimal memory usage

### Node Connection Issues
- The bot features Auto Node Connection Retry [Beta] - it will automatically reconnect to Lavalink nodes
- Check node status in console logs
- Verify node credentials and accessibility

---

## 🤝 Support

- **Discord Server**: [Join Support Server](https://discord.gg/xQF9f9yUEM)
- **Issues**: [GitHub Issues](https://github.com/GlaceYT/PrimeMusic-Lavalink/issues)
- **Author**: GlaceYT

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

- **Created by**: GlaceYT (Shiva)
- **Lavalink**: [lavalink-devs/Lavalink](https://github.com/lavalink-devs/Lavalink)
- **Discord.js**: [discordjs/discord.js](https://github.com/discordjs/discord.js)
- **Riffy**: Lavalink client library

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ by GlaceYT

</div>
