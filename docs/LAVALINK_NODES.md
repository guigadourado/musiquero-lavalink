# Lavalink nodes (from message thread)

Extracted from the support/Discord message thread. Use in `config.js` under `nodes`.

---

## Active nodes

### prmgvyt
- **Source:** prmgvyt — 20/12/25, 25/01/26
- **Hosting:** WispByte.com
- **Version:** 4.1.1 (Stable), High-Resampling
- **Location:** Germany (DE), 24/7

```json
{
  "name": "prmgvyt",
  "password": "prmgvyt",
  "host": "217.160.125.127",
  "port": 14845,
  "secure": false
}
```

**Platforms:** YouTube, YouTube Music, SoundCloud; Twitch/Vimeo, Bandcamp, HTTP.

---

### Lunarnode
- **Source:** ANIK124BD — 20/12/25
- **Hosting:** Lunarnode.xyz *(website reported down)*
- **Version:** Lavalink v4

```json
{
  "name": "Lunarnode",
  "password": "youshallnotpass",
  "host": "in1.lunarnode.xyz",
  "port": 2993,
  "secure": false
}
```

**Platforms:** YouTube.

---

### DEVINE PRO
- **Source:** 3xboiz | ALLAY XD 20 — 28/12/25
- **Version:** 4.1.2 (Build 12/22/2025), Java 21, Lavaplayer 2.2.6

```json
{
  "name": "DEVINE PRO",
  "password": "Devine",
  "host": "top.kyrahost.xyz",
  "port": 2010,
  "secure": false
}
```

**Source managers:** soundcloud, bandcamp, twitch, vimeo, niconico, youtube, spotify, getyarn.io, clypit, speak, reddit, ocremix, tiktok, mixcloud, soundgasm, http (+ plugins).  
**Plugins:** youtube-plugin, lavasrc, DuncteBot, lavalyrics, sponsorblock, lavasearch.  
**Filters:** volume, equalizer, karaoke, timescale, tremolo, vibrato, distortion, rotation, channelMix, lowPass.

---

### Danbot (Harmonix)
- **Source:** ! Mart — 07/02/26
- **Status:** Operational
- **Version:** Lavalink V4

```json
{
  "name": "Harmonix V4",
  "password": "Kaun.Yuvraj",
  "host": "pnode1.danbot.host",
  "port": 1186,
  "secure": false
}
```

**Platforms:** 22+ (Spotify, YouTube, YT Music, JioSaavn, Yandex Music, Qobuz, etc.).

---

### D-Radio
- **Source:** ! Mart / Ariato! — 28/12/25, 10/02/26
- **Location:** Paris 🇫🇷
- **Version:** Lavalink V4.1.2

```json
{
  "name": "D-Radio",
  "password": "KaAs",
  "host": "ishaan.hidencloud.com",
  "port": 24590,
  "secure": false
}
```

**Platforms:** YouTube, Spotify, SoundCloud, MP3 streams (radio).

---

### Serenetia (Amane & AjieDev)
- **Source:** Amane & AjieDev
- **Hosting:** serenetia.com
- **Version:** 3.x / 4.x

**V4:** `lavalinkv4.serenetia.com:443` | **V3:** `lavalinkv3.serenetia.com:443` | **V3/V4:** `lavalink.serenetia.com:443`

```json
{
  "name": "Serenetia V4",
  "password": "https://dsc.gg/ajidevserver",
  "host": "lavalinkv4.serenetia.com",
  "port": 443,
  "secure": true
}
```

---

### Jirayu
- **Source:** Jirayu
- **Version:** 4.0.8 (salee-plugin Proxy)

```json
{
  "name": "Jirayu",
  "password": "youshallnotpass",
  "host": "lavalink.jirayu.net",
  "port": 443,
  "secure": true
}
```

---

### Millohost (AneFaiz)
- **Source:** AneFaiz

```json
{
  "name": "Millohost",
  "password": "https://discord.gg/mjS5J2K3ep",
  "host": "lava-v3.millohost.my.id",
  "port": 443,
  "secure": true
}
```

---

### Rive (southctrl)
- **Source:** southctrl
- **Version:** 4.1.2

```json
{
  "name": "Rive",
  "password": "youshallnotpass",
  "host": "lavalink.rive.wtf",
  "port": 443,
  "secure": true
}
```

---

## Error / unstable

### Yumi Singapore & Canada (Ariato!)
- **Source:** Ariato! — 10/02/26
- **Status:** 🔴 Error (as of Feb 10, 2026)
- **Locations:** Singapore 🇸🇬 (OVH), Canada 🇨🇦 (OVH)
- **Version:** Lavalink V4.1.2

**Singapore:**
```json
{
  "name": "Yumi Singapore",
  "password": "Sakura",
  "host": "sgp.lavalink.yumistack.net",
  "port": 2333,
  "secure": false
}
```

**Canada:**
```json
{
  "name": "Yumi Canada",
  "password": "Sakura",
  "host": "ca.lavalink.yumistack.net",
  "port": 2333,
  "secure": false
}
```

**Platforms (when up):** YouTube, Spotify (not available now), Apple Music, SoundCloud, Deezer, direct links.  
**Note:** Don't forget to clear player sessions if switching nodes.

---

*Last synced from thread: 21/02/2026*
