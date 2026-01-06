// ═══════════════════════════════════════════════════════════════════════════
//                       DISCORD MUSIC BOT 2025
//                    Full Version with YouTube Fix
// ═══════════════════════════════════════════════════════════════════════════

const {
    Client,
    GatewayIntentBits,
    Events,
    EmbedBuilder,
    SlashCommandBuilder,
    REST,
    Routes,
    ActivityType
} = require('discord.js');
const { Player, QueryType } = require('discord-player');
const playdl = require('play-dl');
const express = require('express');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
//                          EXPRESS KEEP-ALIVE SERVER
// ═══════════════════════════════════════════════════════════════════════════

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🎵 Music Bot Status</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    color: #fff;
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .container {
                    background: rgba(255,255,255,0.1);
                    padding: 40px;
                    border-radius: 20px;
                    text-align: center;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    max-width: 400px;
                    width: 100%;
                }
                h1 { font-size: 2.5em; margin-bottom: 10px; }
                .status {
                    display: inline-block;
                    background: #00ff88;
                    color: #000;
                    padding: 8px 20px;
                    border-radius: 20px;
                    font-weight: bold;
                    margin: 15px 0;
                }
                .info {
                    background: rgba(0,0,0,0.3);
                    padding: 15px;
                    border-radius: 10px;
                    margin: 15px 0;
                }
                .info p { margin: 8px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎵 Music Bot</h1>
                <div class="status">✅ ONLINE</div>
                <div class="info">
                    <p>⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s</p>
                    <p>📅 ${new Date().toLocaleString()}</p>
                    <p>🔧 Version: 2.0.0</p>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        version: '2.0.0'
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// ═══════════════════════════════════════════════════════════════════════════
//                          COOKIE SETUP FOR YOUTUBE
// ═══════════════════════════════════════════════════════════════════════════

async function loadCookies() {
    try {
        const cookiesPath = path.join(__dirname, 'cookies.txt');

        if (fs.existsSync(cookiesPath)) {
            console.log('🍪 Found cookies.txt, loading...');
            const cookieContent = fs.readFileSync(cookiesPath, 'utf8');

            const cookies = [];
            const lines = cookieContent.split('\n');

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine && !trimmedLine.startsWith('#')) {
                    const parts = trimmedLine.split('\t');
                    if (parts.length >= 7) {
                        cookies.push({
                            name: parts[5],
                            value: parts[6].trim()
                        });
                    }
                }
            }

            if (cookies.length > 0) {
                const cookieString = cookies
                    .map(c => `${c.name}=${c.value}`)
                    .join('; ');

                await playdl.setToken({
                    youtube: {
                        cookie: cookieString
                    }
                });

                console.log(`✅ Loaded ${cookies.length} YouTube cookies!`);
                return true;
            } else {
                console.log('⚠️ cookies.txt found but no valid cookies parsed');
            }
        } else {
            console.log('⚠️ No cookies.txt found, running without cookies');
        }
    } catch (error) {
        console.error('❌ Error loading cookies:', error.message);
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
//                          DISCORD CLIENT SETUP
// ═══════════════════════════════════════════════════════════════════════════

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ═══════════════════════════════════════════════════════════════════════════
//                          MUSIC PLAYER SETUP
// ═══════════════════════════════════════════════════════════════════════════

const player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
        filter: 'audioonly'
    },
    skipFFmpeg: false
});

async function setupPlayer() {
    try {
        await loadCookies();
        await player.extractors.loadDefault();
        console.log('✅ Music player ready!');
    } catch (error) {
        console.error('❌ Player setup error:', error);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//                          ERROR HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

// ═══════════════════════════════════════════════════════════════════════════
//                          PLAYER EVENTS
// ═══════════════════════════════════════════════════════════════════════════

player.events.on('playerStart', (queue, track) => {
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${track.title}](${track.url})**`)
        .addFields(
            { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
            { name: '⏱️ Duration', value: track.duration || 'Unknown', inline: true },
            { name: '🔊 Volume', value: `${queue.node.volume}%`, inline: true }
        )
        .setThumbnail(track.thumbnail)
        .setFooter({ text: `Requested by ${track.requestedBy?.username || 'Unknown'}` })
        .setTimestamp();

    queue.metadata.channel.send({ embeds: [embed] }).catch(console.error);
});

player.events.on('audioTrackAdd', (queue, track) => {
    if (queue.tracks.size > 0) {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`✅ **${track.title}** added to queue!`)
            .addFields(
                { name: 'Position', value: `#${queue.tracks.size}`, inline: true },
                { name: 'Duration', value: track.duration || 'Unknown', inline: true }
            )
            .setTimestamp();
        queue.metadata.channel.send({ embeds: [embed] }).catch(console.error);
    }
});

player.events.on('playerError', (queue, error) => {
    console.error('Player error:', error);
    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Player Error')
        .setDescription(error.message || 'An error occurred')
        .setTimestamp();
    queue.metadata.channel.send({ embeds: [embed] }).catch(console.error);
});

player.events.on('error', (queue, error) => {
    console.error('Queue error:', error);
});

player.events.on('emptyQueue', (queue) => {
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription('✅ Queue finished!')
        .setTimestamp();
    queue.metadata.channel.send({ embeds: [embed] }).catch(console.error);
});

player.events.on('emptyChannel', (queue) => {
    const embed = new EmbedBuilder()
        .setColor(0xFFFF00)
        .setDescription('⚠️ Voice channel is empty, leaving...')
        .setTimestamp();
    queue.metadata.channel.send({ embeds: [embed] }).catch(console.error);
});

// ═══════════════════════════════════════════════════════════════════════════
//                          SLASH COMMANDS REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube')
        .addStringOption(opt =>
            opt.setName('query')
                .setDescription('Song name or YouTube URL')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),

    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop music and clear queue'),

    new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the music'),

    new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the music'),

    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show music queue'),

    new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show current song'),

    new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set volume (0-100)')
        .addIntegerOption(opt =>
            opt.setName('level')
                .setDescription('Volume level')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)
        ),

    new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the queue'),

    new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Set loop mode')
        .addStringOption(opt =>
            opt.setName('mode')
                .setDescription('Loop mode')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' }
                )
        ),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear the queue'),

    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency')

].map(cmd => cmd.toJSON());

// ═══════════════════════════════════════════════════════════════════════════
//                          BOT READY EVENT
// ═══════════════════════════════════════════════════════════════════════════

client.once(Events.ClientReady, async (c) => {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Bot online: ${c.user.tag}`);
    console.log(`📊 Servers: ${c.guilds.cache.size}`);
    console.log(`🆔 ID: ${c.user.id}`);
    console.log('═══════════════════════════════════════════════════════');

    client.user.setPresence({
        activities: [{ name: '🎵 /play', type: ActivityType.Listening }],
        status: 'online'
    });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('🔄 Registering slash commands...');
        await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
        console.log('✅ Slash commands registered!');
    } catch (error) {
        console.error('❌ Command registration error:', error);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
//                          SEARCH FUNCTION WITH FALLBACK
// ═══════════════════════════════════════════════════════════════════════════

async function searchTrack(query, requestedBy) {
    console.log(`🔍 Searching: ${query}`);

    // Method 1: discord-player search
    try {
        const result = await player.search(query, {
            requestedBy: requestedBy,
            searchEngine: QueryType.AUTO
        });

        if (result.hasTracks()) {
            console.log('✅ Found via discord-player');
            return result;
        }
    } catch (e) {
        console.log('⚠️ discord-player search failed:', e.message);
    }

    // Method 2: play-dl untuk URL YouTube
    if (query.includes('youtube.com') || query.includes('youtu.be')) {
        try {
            console.log('🔄 Trying play-dl for YouTube URL...');
            const info = await playdl.video_info(query);
            if (info) {
                const result = await player.search(info.video_details.title, {
                    requestedBy: requestedBy,
                    searchEngine: QueryType.YOUTUBE_SEARCH
                });
                if (result.hasTracks()) {
                    console.log('✅ Found via play-dl URL');
                    return result;
                }
            }
        } catch (e) {
            console.log('⚠️ play-dl URL failed:', e.message);
        }
    }

    // Method 3: play-dl search
    try {
        console.log('🔄 Trying play-dl search...');
        const searchResults = await playdl.search(query, { limit: 1 });
        if (searchResults.length > 0) {
            const result = await player.search(searchResults[0].title, {
                requestedBy: requestedBy,
                searchEngine: QueryType.YOUTUBE_SEARCH
            });
            if (result.hasTracks()) {
                console.log('✅ Found via play-dl search');
                return result;
            }
        }
    } catch (e) {
        console.log('⚠️ play-dl search failed:', e.message);
    }

    // Method 4: Direct YouTube search
    try {
        console.log('🔄 Trying direct YouTube search...');
        const result = await player.search(query, {
            requestedBy: requestedBy,
            searchEngine: QueryType.YOUTUBE_SEARCH
        });
        if (result.hasTracks()) {
            console.log('✅ Found via YouTube search');
            return result;
        }
    } catch (e) {
        console.log('⚠️ YouTube search failed:', e.message);
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
//                          INTERACTION HANDLER
// ═══════════════════════════════════════════════════════════════════════════

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, member, guild, channel } = interaction;
    const voiceChannel = member?.voice?.channel;

    // ─────────────────────────────────────────────────────────────────────
    // /ping
    // ─────────────────────────────────────────────────────────────────────
    if (commandName === 'ping') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Bot Latency', value: `${Date.now() - interaction.createdTimestamp}ms`, inline: true },
                { name: 'API Latency', value: `${Math.round(client.ws.ping)}ms`, inline: true }
            )
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // Voice channel check
    if (['play', 'skip', 'stop', 'pause', 'resume', 'volume', 'shuffle', 'loop', 'clear'].includes(commandName)) {
        if (!voiceChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('❌ You must be in a voice channel!')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // /play
    // ─────────────────────────────────────────────────────────────────────
    if (commandName === 'play') {
        const query = options.getString('query');
        await interaction.deferReply();

        try {
            const result = await searchTrack(query, interaction.user);

            if (!result || !result.hasTracks()) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ No Results Found')
                    .setDescription(`Could not find: **${query}**`)
                    .addFields({
                        name: '💡 Tips',
                        value: '• Try searching with song title\n• Check if URL is correct\n• Make sure video is public'
                    })
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }

            const { track } = await player.play(voiceChannel, result, {
                nodeOptions: {
                    metadata: { channel, guild },
                    volume: 80,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 60000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 60000,
                    selfDeaf: true
                }
            });

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎵 Added to Queue')
                .setDescription(`**[${track.title}](${track.url})**`)
                .addFields(
                    { name: 'Duration', value: track.duration || 'Unknown', inline: true },
                    { name: 'Artist', value: track.author || 'Unknown', inline: true }
                )
                .setThumbnail(track.thumbnail)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Play error:', error);
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Error')
                .setDescription(`Failed to play: **${query}**`)
                .addFields({ name: 'Error', value: `\`\`\`${error.message}\`\`\`` })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // /skip
    // ─────────────────────────────────────────────────────────────────────
    if (commandName === 'skip') {
        const queue = player.nodes.get(guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }
        const current = queue.currentTrack;
        queue.node.skip();
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`⏭️ Skipped: **${current.title}**`)
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────────────────────────────────
    // /stop
    // ─────────────────────────────────────────────────────────────────────
    if (commandName === 'stop') {
        const queue = player.nodes.get(guild.id);
        if (!queue) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }
        queue.delete();
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription('⏹️ Stopped and cleared queue!')
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────────────────────────────────
    // /pause
    // ─────────────────────────────────────────────────────────────────────
    if (commandName === 'pause') {
        const queue = player.nodes.get(guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }
        if (queue.node.isPaused()) {
            return interaction.reply({ content: '⚠️ Already paused!', ephemeral: true });
        }
        queue.node.pause();
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription('⏸️ Paused!')
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────────────────────────────────
    // /resume
    // ─────────────────────────────────────────────────────────────────────
    if (commandName === 'resume') {
        const queue = player.nodes.get(guild.id);
        if (!queue) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }
        if (!queue.node.isPaused()) {
            return interaction.reply({ content: '⚠️ Not paused!', ephemeral: true });
        }
        queue.node.resume();
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription('▶️ Resumed!')
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────────────────────────────────
    // /queue
    // ─────────────────────────────────────────────────────────────────────
    if (commandName === 'queue') {
        const queue = player.nodes.get(guild.id);
        if (!queue || !queue.currentTrack) {
            return interaction.reply({ content: '❌ Queue is empty!', ephemeral: true });
        }

        const tracks = queue.tracks.map((t, i) => `**${i + 1}.** ${t.title} - \`${t.duration}\``)
            .slice(0, 10).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📋 Music Queue')
            .addFields(
                { name: '🎵 Now Playing', value: `**${queue.currentTrack.title}** - \`${queue.currentTrack.duration}\`` },
                { name: `📝 Up Next (${queue.tracks.size})`, value: tracks || 'No more songs' }
            )
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────────────────────────────────
    // /nowplaying
    // ─────────────────────────────────────────────────────────────────────
    if (commandName === 'nowplaying') {
        const queue = player.nodes.get(guild.id);
        if (!queue || !queue.currentTrack) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }

        const track = queue.currentTrack;
        const progress = queue.node.createProgressBar();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${track.title}](${track.url})**`)
            .addFields(
                { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: track.duration || 'Unknown', inline: true },
                { name: '🔊 Volume', value: `${queue.node.volume}%`, inline: true },
                { name: '📊 Progress', value: progress || '▬▬▬▬▬▬▬▬▬▬' }
            )
            .setThumbnail(track.thumbnail)
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────────────────────────────────
    // /volume
    // ─────────────────────────────────────────────────────────────────────
    if (commandName === 'volume') {
        const queue = player.nodes.get(guild.id);
        if (!queue) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }
        const level = options.getInteger('level');
        queue.node.setVolume(level);
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`🔊 Volume set to **${level}%**`)
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────────────────────────────────
    // /shuffle
    // ─────────────────────────────────────────────────────────────────────
    if (commandName === 'shuffle') {
        const queue = player.nodes.get(guild.id);
        if (!queue || queue.tracks.size < 2) {
            return interaction.reply({ content: '❌ Need at least 2 songs!', ephemeral: true });
        }
        queue.tracks.shuffle();
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`🔀 Shuffled ${queue.tracks.size} songs!`)
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────────────────────────────────
    // /loop
    // ─────────────────────────────────────────────────────────────────────
    if (commandName === 'loop') {
        const queue = player.nodes.get(guild.id);
        if (!queue) {
            return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }
        const mode = options.getString('mode');
        const modes = { 'off': 0, 'track': 1, 'queue': 2 };
        const emojis = { 'off': '➡️', 'track': '🔂', 'queue': '🔁' };
        queue.setRepeatMode(modes[mode]);
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`${emojis[mode]} Loop: **${mode.toUpperCase()}**`)
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────────────────────────────────
    // /clear
    // ─────────────────────────────────────────────────────────────────────
    if (commandName === 'clear') {
        const queue = player.nodes.get(guild.id);
        if (!queue || queue.tracks.size === 0) {
            return interaction.reply({ content: '❌ Queue is already empty!', ephemeral: true });
        }
        const count = queue.tracks.size;
        queue.tracks.clear();
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`🗑️ Cleared **${count}** songs!`)
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
//                          BOT INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function startBot() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('       🎵 DISCORD MUSIC BOT 2025 - STARTING...         ');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    // Setup player
    await setupPlayer();

    // Check token
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
        console.error('❌ DISCORD_TOKEN not found!');
        console.error('   Set it in Render Environment Variables');
        process.exit(1);
    }

    // Login
    try {
        await client.login(token);
    } catch (error) {
        console.error('❌ Login failed:', error.message);
        process.exit(1);
    }
}

startBot();
