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

const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection
} = require('@discordjs/voice');

const play = require('play-dl');
const express = require('express');

// ═══════════════════════════════════════════════════════════════
// EXPRESS SERVER
// ═══════════════════════════════════════════════════════════════
const app = express();
app.get('/', (req, res) => res.send('🎵 Bot Online!'));
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.listen(process.env.PORT || 3000, () => console.log('🌐 Web server ready'));

// ═══════════════════════════════════════════════════════════════
// DISCORD CLIENT
// ═══════════════════════════════════════════════════════════════
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// ═══════════════════════════════════════════════════════════════
// MUSIC QUEUE (Simple Map)
// ═══════════════════════════════════════════════════════════════
const queues = new Map();

function getQueue(guildId) {
    if (!queues.has(guildId)) {
        queues.set(guildId, {
            songs: [],
            player: null,
            connection: null,
            channel: null,
            playing: false,
            volume: 50
        });
    }
    return queues.get(guildId);
}

// ═══════════════════════════════════════════════════════════════
// PLAY FUNCTION
// ═══════════════════════════════════════════════════════════════
async function playSong(guildId) {
    const queue = getQueue(guildId);
    
    if (queue.songs.length === 0) {
        queue.playing = false;
        if (queue.channel) {
            queue.channel.send('✅ Queue selesai!').catch(() => {});
        }
        return;
    }

    const song = queue.songs[0];
    queue.playing = true;

    try {
        console.log(`▶️ Playing: ${song.title}`);

        // Get audio stream dari play-dl
        const stream = await play.stream(song.url);
        
        // Create audio resource
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
            inlineVolume: true
        });
        
        resource.volume?.setVolume(queue.volume / 100);

        // Play
        queue.player.play(resource);

        // Send now playing message
        if (queue.channel) {
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎵 Now Playing')
                .setDescription(`**${song.title}**`)
                .addFields(
                    { name: 'Duration', value: song.duration || 'Unknown', inline: true },
                    { name: 'Requested by', value: song.requestedBy || 'Unknown', inline: true }
                )
                .setThumbnail(song.thumbnail || null);
            
            queue.channel.send({ embeds: [embed] }).catch(() => {});
        }

    } catch (error) {
        console.error('❌ Play error:', error);
        if (queue.channel) {
            queue.channel.send(`❌ Error playing: ${error.message}`).catch(() => {});
        }
        queue.songs.shift();
        playSong(guildId);
    }
}

// ═══════════════════════════════════════════════════════════════
// SLASH COMMANDS
// ═══════════════════════════════════════════════════════════════
const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube')
        .addStringOption(o => 
            o.setName('song')
                .setDescription('Song name or YouTube URL')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip current song'),
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop music and leave'),
    new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause music'),
    new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume music'),
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show queue'),
    new SlashCommandBuilder()
        .setName('np')
        .setDescription('Now playing'),
    new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set volume (0-100)')
        .addIntegerOption(o => 
            o.setName('level')
                .setDescription('Volume level')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)
        ),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot ping')
].map(c => c.toJSON());

// ═══════════════════════════════════════════════════════════════
// BOT READY
// ═══════════════════════════════════════════════════════════════
client.once(Events.ClientReady, async (c) => {
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Bot online: ${c.user.tag}`);
    console.log(`📊 Servers: ${c.guilds.cache.size}`);
    console.log('═══════════════════════════════════════════');

    client.user.setPresence({
        activities: [{ name: '🎵 /play', type: ActivityType.Listening }],
        status: 'online'
    });

    // Register commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log('🔄 Registering commands...');
        await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
        console.log('✅ Commands registered!');
    } catch (error) {
        console.error('❌ Command error:', error);
    }
});

// ═══════════════════════════════════════════════════════════════
// INTERACTION HANDLER
// ═══════════════════════════════════════════════════════════════
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, member, guild, channel } = interaction;
    const voiceChannel = member?.voice?.channel;

    // ─────────────────────────────────────────
    // /ping
    // ─────────────────────────────────────────
    if (commandName === 'ping') {
        return interaction.reply(`🏓 Pong! ${client.ws.ping}ms`);
    }

    // Voice channel check
    if (['play', 'skip', 'stop', 'pause', 'resume', 'volume'].includes(commandName)) {
        if (!voiceChannel) {
            return interaction.reply({ 
                content: '❌ Kamu harus join voice channel dulu!', 
                ephemeral: true 
            });
        }
    }

    // ─────────────────────────────────────────
    // /play
    // ─────────────────────────────────────────
    if (commandName === 'play') {
        const query = options.getString('song');
        await interaction.deferReply();

        try {
            console.log(`🔍 Searching: ${query}`);

            // Search dengan play-dl
            let songInfo;
            let searchResult;

            // Check jika URL
            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                try {
                    const videoInfo = await play.video_info(query);
                    songInfo = {
                        title: videoInfo.video_details.title,
                        url: videoInfo.video_details.url,
                        duration: videoInfo.video_details.durationRaw,
                        thumbnail: videoInfo.video_details.thumbnails[0]?.url,
                        requestedBy: interaction.user.username
                    };
                } catch (e) {
                    console.log('URL failed, trying search...');
                }
            }

            // Jika bukan URL atau URL gagal, search by title
            if (!songInfo) {
                searchResult = await play.search(query, { limit: 1 });
                
                if (searchResult.length === 0) {
                    return interaction.editReply(`❌ Tidak ditemukan: **${query}**`);
                }

                const video = searchResult[0];
                songInfo = {
                    title: video.title,
                    url: video.url,
                    duration: video.durationRaw,
                    thumbnail: video.thumbnails[0]?.url,
                    requestedBy: interaction.user.username
                };
            }

            console.log(`✅ Found: ${songInfo.title}`);

            // Get queue
            const queue = getQueue(guild.id);
            queue.channel = channel;

            // Add to queue
            queue.songs.push(songInfo);

            // Join voice channel jika belum
            if (!queue.connection || queue.connection.state.status === VoiceConnectionStatus.Destroyed) {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: true
                });

                queue.connection = connection;

                // Create audio player
                queue.player = createAudioPlayer();

                // Subscribe connection ke player
                connection.subscribe(queue.player);

                // Handle player events
                queue.player.on(AudioPlayerStatus.Idle, () => {
                    console.log('⏭️ Song finished');
                    queue.songs.shift();
                    playSong(guild.id);
                });

                queue.player.on('error', (error) => {
                    console.error('❌ Player error:', error);
                    queue.songs.shift();
                    playSong(guild.id);
                });

                // Handle connection events
                connection.on(VoiceConnectionStatus.Disconnected, async () => {
                    try {
                        await Promise.race([
                            entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                            entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                        ]);
                    } catch (error) {
                        connection.destroy();
                        queues.delete(guild.id);
                    }
                });
            }

            // Jika belum playing, mulai play
            if (!queue.playing) {
                playSong(guild.id);
            }

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('✅ Ditambahkan ke Queue')
                .setDescription(`**${songInfo.title}**`)
                .addFields(
                    { name: 'Duration', value: songInfo.duration || 'Unknown', inline: true },
                    { name: 'Position', value: `#${queue.songs.length}`, inline: true }
                )
                .setThumbnail(songInfo.thumbnail || null);

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Search error:', error);
            return interaction.editReply(`❌ Error: ${error.message}`);
        }
    }

    // ─────────────────────────────────────────
    // /skip
    // ─────────────────────────────────────────
    if (commandName === 'skip') {
        const queue = getQueue(guild.id);
        
        if (queue.songs.length === 0) {
            return interaction.reply({ content: '❌ Tidak ada lagu!', ephemeral: true });
        }

        queue.player?.stop();
        return interaction.reply('⏭️ Skipped!');
    }

    // ─────────────────────────────────────────
    // /stop
    // ─────────────────────────────────────────
    if (commandName === 'stop') {
        const queue = getQueue(guild.id);
        
        queue.songs = [];
        queue.playing = false;
        queue.player?.stop();
        queue.connection?.destroy();
        queues.delete(guild.id);

        return interaction.reply('⏹️ Stopped!');
    }

    // ─────────────────────────────────────────
    // /pause
    // ─────────────────────────────────────────
    if (commandName === 'pause') {
        const queue = getQueue(guild.id);
        
        if (!queue.playing) {
            return interaction.reply({ content: '❌ Tidak ada lagu!', ephemeral: true });
        }

        queue.player?.pause();
        return interaction.reply('⏸️ Paused!');
    }

    // ─────────────────────────────────────────
    // /resume
    // ─────────────────────────────────────────
    if (commandName === 'resume') {
        const queue = getQueue(guild.id);
        
        queue.player?.unpause();
        return interaction.reply('▶️ Resumed!');
    }

    // ─────────────────────────────────────────
    // /queue
    // ─────────────────────────────────────────
    if (commandName === 'queue') {
        const queue = getQueue(guild.id);
        
        if (queue.songs.length === 0) {
            return interaction.reply({ content: '❌ Queue kosong!', ephemeral: true });
        }

        const current = queue.songs[0];
        const upcoming = queue.songs.slice(1, 6).map((s, i) => `${i + 1}. ${s.title}`).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📋 Queue')
            .addFields(
                { name: '🎵 Now Playing', value: current.title },
                { name: `📝 Up Next (${queue.songs.length - 1})`, value: upcoming || 'Empty' }
            );

        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // /np (Now Playing)
    // ─────────────────────────────────────────
    if (commandName === 'np') {
        const queue = getQueue(guild.id);
        
        if (queue.songs.length === 0 || !queue.playing) {
            return interaction.reply({ content: '❌ Tidak ada lagu!', ephemeral: true });
        }

        const song = queue.songs[0];
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎵 Now Playing')
            .setDescription(`**${song.title}**`)
            .addFields(
                { name: 'Duration', value: song.duration || 'Unknown', inline: true },
                { name: 'Volume', value: `${queue.volume}%`, inline: true }
            )
            .setThumbnail(song.thumbnail || null);

        return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────
    // /volume
    // ─────────────────────────────────────────
    if (commandName === 'volume') {
        const queue = getQueue(guild.id);
        const level = options.getInteger('level');
        
        queue.volume = level;
        
        return interaction.reply(`🔊 Volume: ${level}%`);
    }
});

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLERS
// ═══════════════════════════════════════════════════════════════
process.on('unhandledRejection', (error) => {
    console.error('Unhandled:', error);
});

// ═══════════════════════════════════════════════════════════════
// START BOT
// ═══════════════════════════════════════════════════════════════
console.log('');
console.log('🚀 Starting Discord Music Bot v5.0...');
console.log('');

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN tidak ditemukan!');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
