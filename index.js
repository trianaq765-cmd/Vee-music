// ═══════════════════════════════════════════════════════════════════════════
//                       DISCORD MUSIC BOT 2025 v3.0
//                      Fixed Audio with YouTubei
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
const { YoutubeiExtractor } = require('discord-player-youtubei');
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
            <title>🎵 Vee Music Bot</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #fff;
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .container {
                    background: rgba(0,0,0,0.3);
                    padding: 40px;
                    border-radius: 20px;
                    text-align: center;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                }
                h1 { font-size: 2.5em; margin-bottom: 10px; }
                .status {
                    display: inline-block;
                    background: #00ff88;
                    color: #000;
                    padding: 10px 25px;
                    border-radius: 25px;
                    font-weight: bold;
                    margin: 15px 0;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .info { margin-top: 20px; opacity: 0.9; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎵 Vee Music</h1>
                <div class="status">✅ ONLINE</div>
                <div class="info">
                    <p>⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s</p>
                    <p>🔧 Version 3.0.0</p>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
    console.log(`🌐 Web server: port ${PORT}`);
});

// ═══════════════════════════════════════════════════════════════════════════
//                          DISCORD CLIENT
// ═══════════════════════════════════════════════════════════════════════════

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

// ═══════════════════════════════════════════════════════════════════════════
//                          MUSIC PLAYER WITH YOUTUBEI
// ═══════════════════════════════════════════════════════════════════════════

const player = new Player(client, {
    skipFFmpeg: false,
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25
    }
});

// Load cookies untuk YouTube
function loadCookies() {
    try {
        const cookiesPath = path.join(__dirname, 'cookies.txt');
        if (fs.existsSync(cookiesPath)) {
            const content = fs.readFileSync(cookiesPath, 'utf8');
            const cookies = [];
            
            for (const line of content.split('\n')) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const parts = trimmed.split('\t');
                    if (parts.length >= 7) {
                        cookies.push({
                            name: parts[5],
                            value: parts[6].trim(),
                            domain: parts[0],
                            path: parts[2],
                            secure: parts[3] === 'TRUE',
                            httpOnly: false,
                            sameSite: 'Lax'
                        });
                    }
                }
            }
            
            console.log(`🍪 Loaded ${cookies.length} cookies`);
            return cookies;
        }
    } catch (error) {
        console.error('❌ Cookie error:', error.message);
    }
    return [];
}

// Setup player dengan YouTubei extractor
async function setupPlayer() {
    try {
        const cookies = loadCookies();
        
        // Register YouTubei extractor (lebih stabil dari YouTube scraper)
        await player.extractors.register(YoutubeiExtractor, {
            authentication: cookies.length > 0 ? '' : undefined,
            cookie: cookies.length > 0 ? cookies : undefined,
            streamOptions: {
                useClient: 'ANDROID'
            }
        });
        
        // Load default extractors untuk platform lain
        await player.extractors.loadDefault((ext) => ext !== 'YouTubeExtractor');
        
        console.log('✅ Player ready with YouTubei!');
        
    } catch (error) {
        console.error('❌ Player setup error:', error);
        
        // Fallback ke default extractors
        try {
            await player.extractors.loadDefault();
            console.log('✅ Fallback: Default extractors loaded');
        } catch (e) {
            console.error('❌ Fallback failed:', e);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//                          ERROR HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

process.on('unhandledRejection', (error) => {
    console.error('Unhandled:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught:', error);
});

// ═══════════════════════════════════════════════════════════════════════════
//                          PLAYER EVENTS
// ═══════════════════════════════════════════════════════════════════════════

player.events.on('playerStart', (queue, track) => {
    console.log(`▶️ Playing: ${track.title}`);
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${track.title}](${track.url})**`)
        .addFields(
            { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
            { name: '⏱️ Duration', value: track.duration || '0:00', inline: true },
            { name: '🔊 Volume', value: `${queue.node.volume}%`, inline: true }
        )
        .setThumbnail(track.thumbnail)
        .setTimestamp();

    queue.metadata.channel.send({ embeds: [embed] }).catch(console.error);
});

player.events.on('audioTrackAdd', (queue, track) => {
    console.log(`➕ Added: ${track.title}`);
});

player.events.on('playerError', (queue, error) => {
    console.error('Player Error:', error);
    queue.metadata.channel.send(`❌ Error: ${error.message}`).catch(console.error);
});

player.events.on('error', (queue, error) => {
    console.error('Queue Error:', error);
});

player.events.on('connection', (queue) => {
    console.log('🔗 Voice connected!');
});

player.events.on('disconnect', (queue) => {
    console.log('🔌 Voice disconnected');
});

player.events.on('emptyQueue', (queue) => {
    queue.metadata.channel.send('✅ Queue finished!').catch(console.error);
});

player.events.on('emptyChannel', (queue) => {
    queue.metadata.channel.send('👋 Left empty channel').catch(console.error);
});

// Debug event untuk audio
player.events.on('debug', (queue, message) => {
    if (message.includes('error') || message.includes('Error')) {
        console.log('🔧 Debug:', message);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
//                          SLASH COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song')
        .addStringOption(opt =>
            opt.setName('query')
                .setDescription('Song name or URL')
                .setRequired(true)
        ),
    new SlashCommandBuilder().setName('skip').setDescription('Skip song'),
    new SlashCommandBuilder().setName('stop').setDescription('Stop music'),
    new SlashCommandBuilder().setName('pause').setDescription('Pause music'),
    new SlashCommandBuilder().setName('resume').setDescription('Resume music'),
    new SlashCommandBuilder().setName('queue').setDescription('Show queue'),
    new SlashCommandBuilder().setName('np').setDescription('Now playing'),
    new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set volume')
        .addIntegerOption(opt =>
            opt.setName('level')
                .setDescription('0-100')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)
        ),
    new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle queue'),
    new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Loop mode')
        .addStringOption(opt =>
            opt.setName('mode')
                .setDescription('Mode')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' }
                )
        ),
    new SlashCommandBuilder().setName('clear').setDescription('Clear queue'),
    new SlashCommandBuilder().setName('ping').setDescription('Bot ping')
].map(cmd => cmd.toJSON());

// ═══════════════════════════════════════════════════════════════════════════
//                          BOT READY
// ═══════════════════════════════════════════════════════════════════════════

client.once(Events.ClientReady, async (c) => {
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Bot: ${c.user.tag}`);
    console.log(`📊 Servers: ${c.guilds.cache.size}`);
    console.log('═══════════════════════════════════════════');

    client.user.setPresence({
        activities: [{ name: '🎵 /play', type: ActivityType.Listening }],
        status: 'online'
    });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
        console.log('✅ Commands registered!');
    } catch (error) {
        console.error('❌ Command error:', error);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
//                          COMMAND HANDLER
// ═══════════════════════════════════════════════════════════════════════════

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, member, guild, channel } = interaction;
    const voiceChannel = member?.voice?.channel;

    // ───────────────────────────────────────────────────────────────────────
    // /ping
    // ───────────────────────────────────────────────────────────────────────
    if (commandName === 'ping') {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Latency', value: `${Date.now() - interaction.createdTimestamp}ms`, inline: true },
                { name: 'API', value: `${Math.round(client.ws.ping)}ms`, inline: true }
            );
        return interaction.reply({ embeds: [embed] });
    }

    // Voice check
    const needsVoice = ['play', 'skip', 'stop', 'pause', 'resume', 'volume', 'shuffle', 'loop', 'clear'];
    if (needsVoice.includes(commandName) && !voiceChannel) {
        return interaction.reply({ content: '❌ Join a voice channel first!', ephemeral: true });
    }

    // ───────────────────────────────────────────────────────────────────────
    // /play
    // ───────────────────────────────────────────────────────────────────────
    if (commandName === 'play') {
        const query = options.getString('query');
        await interaction.deferReply();

        try {
            console.log(`🔍 Searching: ${query}`);

            // Search dengan multiple methods
            let result = await player.search(query, {
                requestedBy: interaction.user,
                searchEngine: QueryType.AUTO
            });

            if (!result.hasTracks()) {
                // Fallback: coba YouTube search
                result = await player.search(query, {
                    requestedBy: interaction.user,
                    searchEngine: QueryType.YOUTUBE_SEARCH
                });
            }

            if (!result.hasTracks()) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setDescription(`❌ No results for: **${query}**`)
                    ]
                });
            }

            console.log(`✅ Found: ${result.tracks[0].title}`);

            // Play dengan settings yang benar
            const { track, queue } = await player.play(voiceChannel, result, {
                nodeOptions: {
                    metadata: { channel, guild },
                    volume: 80,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 60000,
                    leaveOnEnd: false,
                    leaveOnEndCooldown: 60000,
                    selfDeaf: true,
                    skipOnNoStream: true
                }
            });

            console.log(`🎵 Playing: ${track.title}`);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎵 Added to Queue')
                .setDescription(`**[${track.title}](${track.url})**`)
                .addFields(
                    { name: 'Duration', value: track.duration || '0:00', inline: true },
                    { name: 'Artist', value: track.author || 'Unknown', inline: true }
                )
                .setThumbnail(track.thumbnail);

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Play Error:', error);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ Error')
                        .setDescription(`\`\`\`${error.message}\`\`\``)
                ]
            });
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // /skip
    // ───────────────────────────────────────────────────────────────────────
    if (commandName === 'skip') {
        const queue = player.nodes.get(guild.id);
        if (!queue?.isPlaying()) {
            return interaction.reply({ content: '❌ Nothing playing!', ephemeral: true });
        }
        const title = queue.currentTrack.title;
        queue.node.skip();
        return interaction.reply(`⏭️ Skipped: **${title}**`);
    }

    // ───────────────────────────────────────────────────────────────────────
    // /stop
    // ───────────────────────────────────────────────────────────────────────
    if (commandName === 'stop') {
        const queue = player.nodes.get(guild.id);
        if (!queue) {
            return interaction.reply({ content: '❌ Nothing playing!', ephemeral: true });
        }
        queue.delete();
        return interaction.reply('⏹️ Stopped!');
    }

    // ───────────────────────────────────────────────────────────────────────
    // /pause
    // ───────────────────────────────────────────────────────────────────────
    if (commandName === 'pause') {
        const queue = player.nodes.get(guild.id);
        if (!queue?.isPlaying()) {
            return interaction.reply({ content: '❌ Nothing playing!', ephemeral: true });
        }
        queue.node.pause();
        return interaction.reply('⏸️ Paused!');
    }

    // ───────────────────────────────────────────────────────────────────────
    // /resume
    // ───────────────────────────────────────────────────────────────────────
    if (commandName === 'resume') {
        const queue = player.nodes.get(guild.id);
        if (!queue) {
            return interaction.reply({ content: '❌ Nothing playing!', ephemeral: true });
        }
        queue.node.resume();
        return interaction.reply('▶️ Resumed!');
    }

    // ───────────────────────────────────────────────────────────────────────
    // /queue
    // ───────────────────────────────────────────────────────────────────────
    if (commandName === 'queue') {
        const queue = player.nodes.get(guild.id);
        if (!queue?.currentTrack) {
            return interaction.reply({ content: '❌ Queue empty!', ephemeral: true });
        }

        const tracks = queue.tracks.map((t, i) => `**${i + 1}.** ${t.title}`).slice(0, 10).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📋 Queue')
            .addFields(
                { name: '🎵 Now', value: queue.currentTrack.title },
                { name: `📝 Next (${queue.tracks.size})`, value: tracks || 'Empty' }
            );
        return interaction.reply({ embeds: [embed] });
    }

    // ───────────────────────────────────────────────────────────────────────
    // /np
    // ───────────────────────────────────────────────────────────────────────
    if (commandName === 'np') {
        const queue = player.nodes.get(guild.id);
        if (!queue?.currentTrack) {
            return interaction.reply({ content: '❌ Nothing playing!', ephemeral: true });
        }

        const track = queue.currentTrack;
        const progress = queue.node.createProgressBar();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎵 Now Playing')
            .setDescription(`**${track.title}**`)
            .addFields(
                { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: track.duration || '0:00', inline: true },
                { name: '📊 Progress', value: progress || '▬▬▬▬▬▬▬▬▬▬' }
            )
            .setThumbnail(track.thumbnail);
        return interaction.reply({ embeds: [embed] });
    }

    // ───────────────────────────────────────────────────────────────────────
    // /volume
    // ───────────────────────────────────────────────────────────────────────
    if (commandName === 'volume') {
        const queue = player.nodes.get(guild.id);
        if (!queue) {
            return interaction.reply({ content: '❌ Nothing playing!', ephemeral: true });
        }
        const level = options.getInteger('level');
        queue.node.setVolume(level);
        return interaction.reply(`🔊 Volume: **${level}%**`);
    }

    // ───────────────────────────────────────────────────────────────────────
    // /shuffle
    // ───────────────────────────────────────────────────────────────────────
    if (commandName === 'shuffle') {
        const queue = player.nodes.get(guild.id);
        if (!queue || queue.tracks.size < 2) {
            return interaction.reply({ content: '❌ Need 2+ songs!', ephemeral: true });
        }
        queue.tracks.shuffle();
        return interaction.reply('🔀 Shuffled!');
    }

    // ───────────────────────────────────────────────────────────────────────
    // /loop
    // ───────────────────────────────────────────────────────────────────────
    if (commandName === 'loop') {
        const queue = player.nodes.get(guild.id);
        if (!queue) {
            return interaction.reply({ content: '❌ Nothing playing!', ephemeral: true });
        }
        const mode = options.getString('mode');
        const modes = { 'off': 0, 'track': 1, 'queue': 2 };
        queue.setRepeatMode(modes[mode]);
        return interaction.reply(`🔁 Loop: **${mode}**`);
    }

    // ───────────────────────────────────────────────────────────────────────
    // /clear
    // ───────────────────────────────────────────────────────────────────────
    if (commandName === 'clear') {
        const queue = player.nodes.get(guild.id);
        if (!queue || queue.tracks.size === 0) {
            return interaction.reply({ content: '❌ Queue empty!', ephemeral: true });
        }
        const count = queue.tracks.size;
        queue.tracks.clear();
        return interaction.reply(`🗑️ Cleared ${count} songs!`);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
//                          START BOT
// ═══════════════════════════════════════════════════════════════════════════

async function start() {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('    🎵 DISCORD MUSIC BOT v3.0 STARTING     ');
    console.log('═══════════════════════════════════════════');
    console.log('');

    await setupPlayer();

    const token = process.env.DISCORD_TOKEN;
    if (!token) {
        console.error('❌ No DISCORD_TOKEN!');
        process.exit(1);
    }

    try {
        await client.login(token);
    } catch (error) {
        console.error('❌ Login failed:', error);
        process.exit(1);
    }
}

start();
