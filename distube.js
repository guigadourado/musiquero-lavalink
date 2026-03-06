const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const colors = require('./UI/colors/colors');

let getLangSync;
try {
    const langLoader = require('./utils/languageLoader.js');
    getLangSync = langLoader.getLangSync;
} catch (e) {
    getLangSync = () => ({ console: {} });
}

let distubeInstance = null;

function initializeDistube(client) {
    if (distubeInstance) return distubeInstance;

    distubeInstance = new DisTube(client, {
        plugins: [
            new YtDlpPlugin({ update: false }),
        ],
        emitNewSongOnly: false,
        savePreviousSongs: true,
    });

    client.distube = distubeInstance;

    console.log(`${colors.cyan}[ DISTUBE ]${colors.reset} ${colors.green}DisTube initialized successfully 🎵${colors.reset}`);

    return distubeInstance;
}

function getDistube() {
    return distubeInstance;
}

module.exports = { initializeDistube, getDistube };
