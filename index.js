// ═══════════════════════════════════════════════════════════════
//                    DISCORD MUSIC BOT 2025
//               Enhanced Version with Cookie Support
// ═══════════════════════════════════════════════════════════════

const { Client, GatewayIntentBits, Events, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActivityType } = require('discord.js');
const { Player, QueryType } = require('discord-player');
const { YouTubeExtractor } = require('@discord-player/extractor');
const playdl = require('play-dl');
const express = require('express');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────
// EXPRESS SERVER (Keep-Alive untuk Render)
// ─────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Music Bot Status</title>
            <style>
                body { font-family: Arial; background: #1a1a1a; color: white; padding: 20px; }
                h1 { color: #7289da; }
                .status { background: #2a2a2a; padding: 15px; border-radius: 10px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <h1>🎵 Discord Music Bot</h1>
            <div class="status">
                <p>✅ Status: <strong>ONLINE</strong></p>
                <p>⏱️ Uptime: <strong>${Math.floor(process.uptime())} seconds</strong></p>
                <p>📅 Started: <strong>${new Date(Date.now() - process.uptime() * 1000).toLocaleString()}</strong></p>
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
        version: '1.0.0'
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// ─────────────────────────────────────────────────────────────────
// COOKIE SETUP UNTUK YOUTUBE
// ─────────────────────────────────────────────────────────────────
async function setupCookies() {
    try {
        const cookiesPath = path.join(__dirname, 'cookies.txt');
        
        if (fs.existsSync(cookiesPath)) {
            console.log('🍪 Found cookies.txt, attempting to load...');
            const cookieContent = fs.readFileSync(cookiesPath, 'utf8');
            
            // Parse Netscape cookies format
            const cookies = cookieContent
                .split('\n')
                .filter(line => line && !line.startsWith('#'))
                .map(line => {
                    const parts = line.split('\t');
                    if (parts.length >= 7) {
                        return {
                            domain: parts[0],
                            name: parts[5],
                            value: parts[6]
                        };
                    }
                    return null;
                })
                .filter(cookie => cookie !== null);

            // Set cookies untuk play-dl
            if (cookies.length > 0) {
                // Convert to cookie string format
                const cookieString = cookies
                    .map(c => `${c.name}=${c.value}`)
                    .join('; ');
                
                // Set authorization untuk play-dl
                await playdl.setToken({
                    youtube: {
                        cookie: cookieString
                    }
                });
                
                console.log(`✅ Loaded ${cookies.length} cookies successfully!`);
                return true;
            }
        } else {
            console.log('⚠️ No cookies.txt found - running without cookies');
            console.log('   Bot may encounter "Sign in to confirm" errors');
        }
    } catch (error) {
        console.error('❌ Error loading cookies:', error);
    }
    return false;
}

// ─────────────────────────────────────────────────────────────────
// DISCORD CLIENT SETUP
// ─────────────────────────────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ─────────────────────────────────────────────────────────────────
// MUSIC PLAYER SETUP
// ─────────────────────────────────────────────────────────────────
const player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
        filter: 'audioonly'
    },
    connectionTimeout: 30000,
    smoothVolume: true,
    initialVolume: 80
});

// Register extractors
async function setupPlayer() {
    try {
        // Load default extractors
        await player.extractors.loadDefault((ext) => {
            // Filter out unwanted extractors if needed
            return true;
        });
        
        console.log('✅ Music player initialized successfully!');
    } catch (error) {
        console.error('❌ Failed to setup player:', error);
    }
}

// ─────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

// ─────────────────────────────────────────────────────────────────
// PLAYER EVENTS
// ─────────────────────────────────────────────────────────────────
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

    queue.metadata.channel.send({ embeds: [embed] });
});

player.events.on('audioTrackAdd', (queue, track) => {
    if (queue.tracks.size > 0) {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`✅ **${track.title}** added to queue!`)
            .addFields(
                { name: 'Position', value: `#${queue.tracks.size}`, inline: true },
                { name: 'Duration', value: track.duration, inline: true }
            );
        queue.metadata.channel.send({ embeds: [embed] });
    }
});

player.events.on('playerError', (queue, error) => {
    console.error(`Player error in guild ${queue.guild.id}:`, error);
    
    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Player Error')
        .setDescription(`An error occurred while playing music.`)
        .addFields({ name: 'Error', value: `\`\`\`${error.message}\`\`\`` })
        .setTimestamp();
    
    queue.metadata.channel.send({ embeds: [embed] });
});

player.events.on('error', (queue, error) => {
    console.error(`Queue error in guild ${queue.guild.id}:`, error);
});

player.events.on('emptyQueue', (queue) => {
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription('✅ Queue finished! No more songs to play.')
        .setTimestamp();
    
    queue.metadata.channel.send({ embeds: [embed] });
});

player.events.on('emptyChannel', (queue) => {
    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setDescription('❌ Voice channel is empty. Leaving...')
        .setTimestamp();
    
    queue.metadata.channel.send({ embeds: [embed] });
});

player.events.on('disconnect', (queue) => {
    queue.metadata.channel.send('❌ Disconnected from voice channel.');
});

// ─────────────────────────────────────────────────────────────────
// REGISTER SLASH COMMANDS
// ─────────────────────────────────────────────────────────────────
const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or YouTube URL')
                .setRequired(true)
        ),
    
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playing and clear queue'),
    
    new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),
    
    new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the paused song'),
    
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current queue'),
    
    new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing song'),
    
    new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set the volume (0-100)')
        .addIntegerOption(option =>
            option.setName('level')
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
        .addStringOption(option =>
            option.setName('mode')
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
].map(command => command.toJSON());

// ─────────────────────────────────────────────────────────────────
// BOT READY EVENT
// ─────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, async (c) => {
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Bot logged in as: ${c.user.tag}`);
    console.log(`📊 Serving ${c.guilds.cache.size} servers`);
    console.log(`🆔 Bot ID: ${c.user.id}`);
    console.log('═══════════════════════════════════════════');
    
    // Set bot activity
    client.user.setPresence({
        activities: [{
            name: '🎵 /play to start!',
            type: ActivityType.Listening
        }],
        status: 'online'
    });
    
    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log('🔄 Registering slash commands...');
        
        // Register globally (available in all servers)
        await rest.put(
            Routes.applicationCommands(c.user.id),
            { body: commands }
        );
        
        console.log('✅ Successfully registered slash commands!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
});

// ─────────────────────────────────────────────────────────────────
// INTERACTION HANDLER (Commands)
// ─────────────────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, member, guild, channel } = interaction;

    // ─────────────────────────────────────────
    // /ping command
    // ─────────────────────────────────────────
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

    // Voice channel check for music commands
    const voiceChannel = member?.voice?.channel;
    
    if (['play', 'skip', 'stop', 'pause', 'resume', 'volume', 'shuffle', 'loop', 'clear'].includes(commandName)) {
        if (!voiceChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('❌ You need to be in a voice channel to use this command!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }

    // ─────────────────────────────────────────
    // /play command
    // ─────────────────────────────────────────
    if (commandName === 'play') {
        const query = options.getString('query');
        
        await interaction.deferReply();

        try {
            // Search for track
            const result = await player.search(query, {
                requestedBy: interaction.user,
                searchEngine: QueryType.AUTO
            });

            if (!result.hasTracks()) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setDescription(`❌ No results found for: **${query}**`)
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            }

            // Play the track
            const { track, queue } = await player.play(voiceChannel, result, {
                nodeOptions: {
                    metadata: {
                        channel: channel,
                        guild: guild
                    },
                    volume: 80,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 60000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 60000,
                    selfDeaf: true
                }
            });

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setDescription(`🎵 Loading: **${track.title}**`)
                .addFields(
                    { name: 'Duration', value: track.duration, inline: true },
                    { name: 'Source', value: track.source || 'YouTube', inline: true }
                )
                .setThumbnail(track.thumbnail)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Play command error:', error);
            
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Error')
                .setDescription('Failed to play the track.')
                .addFields({ name: 'Details', value: `\`\`\`${error.message}\`\`\`` })
                .setTimestamp();
            
            return interaction.editReply({ embeds: [embed] });
        }
    }

    // ─────────────────────────────────────────
    // /skip command
    // ─────────────────────────────────────────
    if (commandName === 'skip') {
        const queue = player.nodes.get(guild.id);
        
        if (!queue || !queue.isPlaying()) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('❌ No music is currently playing!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const currentTrack = queue.currentTrack;
        queue.node.skip();
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`⏭️ Skipped: **${currentTrack.title}**`)
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // /stop command
    // ─────────────────────────────────────────
    if (commandName === 'stop') {
        const queue = player.nodes.get(guild.id);
        
        if (!queue) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('❌ No music is currently playing!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        queue.delete();
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription('⏹️ Music stopped and queue cleared!')
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // /pause command
    // ─────────────────────────────────────────
    if (commandName === 'pause') {
        const queue = player.nodes.get(guild.id);
        
        if (!queue || !queue.isPlaying()) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('❌ No music is currently playing!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (queue.node.isPaused()) {
            const embed = new EmbedBuilder()
                .setColor(0xFFFF00)
                .setDescription('⚠️ Music is already paused!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        queue.node.pause();
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription('⏸️ Music paused!')
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // /resume command
    // ─────────────────────────────────────────
    if (commandName === 'resume') {
        const queue = player.nodes.get(guild.id);
        
        if (!queue) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('❌ No music is currently playing!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (!queue.node.isPaused()) {
            const embed = new EmbedBuilder()
                .setColor(0xFFFF00)
                .setDescription('⚠️ Music is not paused!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        queue.node.resume();
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription('▶️ Music resumed!')
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // /queue command
    // ─────────────────────────────────────────
    if (commandName === 'queue') {
        const queue = player.nodes.get(guild.id);
        
        if (!queue || !queue.currentTrack) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('❌ The queue is empty!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const tracks = queue.tracks.map((track, i) => 
            `**${i + 1}.** ${track.title} - \`${track.duration}\``
        ).slice(0, 10).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📋 Music Queue')
            .addFields(
                { 
                    name: '🎵 Now Playing', 
                    value: `**${queue.currentTrack.title}** - \`${queue.currentTrack.duration}\`` 
                },
                { 
                    name: `📝 Up Next (${queue.tracks.size} songs)`, 
                    value: tracks || 'No more songs in queue' 
                }
            )
            .setFooter({ text: `Page 1/1 • Total: ${queue.tracks.size} songs` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // /nowplaying command
    // ─────────────────────────────────────────
    if (commandName === 'nowplaying') {
        const queue = player.nodes.get(guild.id);
        
        if (!queue || !queue.currentTrack) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('❌ No music is currently playing!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const track = queue.currentTrack;
        const progress = queue.node.createProgressBar();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${track.title}](${track.url})**`)
            .addFields(
                { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: track.duration, inline: true },
                { name: '🔊 Volume', value: `${queue.node.volume}%`, inline: true },
                { name: '📊 Progress', value: progress || '━━━━━━━━━━' }
            )
            .setThumbnail(track.thumbnail)
            .setFooter({ text: `Requested by ${track.requestedBy?.username}` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // /volume command
    // ─────────────────────────────────────────
    if (commandName === 'volume') {
        const queue = player.nodes.get(guild.id);
        const level = options.getInteger('level');
        
        if (!queue) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('❌ No music is currently playing!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        queue.node.setVolume(level);
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`🔊 Volume set to **${level}%**`)
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // /shuffle command
    // ─────────────────────────────────────────
    if (commandName === 'shuffle') {
        const queue = player.nodes.get(guild.id);
        
        if (!queue || queue.tracks.size < 2) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('❌ Need at least 2 songs in queue to shuffle!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        queue.tracks.shuffle();
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`🔀 Queue shuffled! (${queue.tracks.size} songs)`)
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // /loop command
    // ─────────────────────────────────────────
    if (commandName === 'loop') {
        const queue = player.nodes.get(guild.id);
        const mode = options.getString('mode');
        
        if (!queue) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('❌ No music is currently playing!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const modes = {
            'off': 0,
            'track': 1,
            'queue': 2
        };

        queue.setRepeatMode(modes[mode]);
        
        const modeEmojis = {
            'off': '➡️',
            'track': '🔂',
            'queue': '🔁'
        };
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`${modeEmojis[mode]} Loop mode set to: **${mode.toUpperCase()}**`)
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // /clear command
    // ─────────────────────────────────────────
    if (commandName === 'clear') {
        const queue = player.nodes.get(guild.id);
        
        if (!queue || queue.tracks.size === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription('❌ The queue is already empty!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const tracksCount = queue.tracks.size;
        queue.tracks.clear();
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`🗑️ Cleared **${tracksCount}** songs from the queue!`)
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }
});

// ─────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────
async function initialize() {
    console.log('🚀 Starting Discord Music Bot...');
    console.log('═══════════════════════════════════════════');
    
    // Setup cookies
    await setupCookies();
    
    // Setup player
    await setupPlayer();
    
    // Login to Discord
    const token = process.env.DISCORD_TOKEN;
    
    if (!token) {
        console.error('❌ DISCORD_TOKEN not found in environment variables!');
        console.error('   Please set DISCORD_TOKEN in Render dashboard');
        process.exit(1);
    }
    
    try {
        await client.login(token);
    } catch (error) {
        console.error('❌ Failed to login to Discord:', error);
        console.error('   Please check your bot token');
        process.exit(1);
    }
}

// Start the bot
initialize();
