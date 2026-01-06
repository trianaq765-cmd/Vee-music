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
    entersState
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
// YOUTUBE COOKIES - Dari file yang kamu berikan
// ═══════════════════════════════════════════════════════════════
const YOUTUBE_COOKIES = [
    "SID=g.a0005QjcBdc2BC6jz3lT0JPtrL5tvOjL3B1wzFTwoVhyIioi6NM8M9zBB48M4D5Xx2iKXJtgHQACgYKAVgSARESFQHGX2MioAIUlmJ512O_ICVG_NVCQRoVAUF8yKqbOyK9VdAC8pQiv4kGL2ZY0076",
    "HSID=A0qtNBqcEbZDkVOz1",
    "SSID=AoydVGpWckubcXUyy",
    "APISID=R21kAQXzEpJ2NbdM/AzHi8-Mxe8Fqh6HSh",
    "SAPISID=JMnVLaVd2OW1sVm-/A0Yol0W13z1pYMyjN",
    "__Secure-1PSID=g.a0005QjcBdc2BC6jz3lT0JPtrL5tvOjL3B1wzFTwoVhyIioi6NM8TpoAc89W7fZutXoKyarP_gACgYKASUSARESFQHGX2MiRk4EA9h2Tmka-0JgyZG-cBoVAUF8yKo20NddX4NURQRU6Xrxq-Wa0076",
    "__Secure-3PSID=g.a0005QjcBdc2BC6jz3lT0JPtrL5tvOjL3B1wzFTwoVhyIioi6NM8fseMOJFlvC8dsOjlFij3uQACgYKAboSARESFQHGX2Mict36nyJZ4koln_Q0WHMK5BoVAUF8yKryTao5G2vmUrZSdfBoiLlm0076",
    "__Secure-1PAPISID=JMnVLaVd2OW1sVm-/A0Yol0W13z1pYMyjN",
    "__Secure-3PAPISID=JMnVLaVd2OW1sVm-/A0Yol0W13z1pYMyjN",
    "LOGIN_INFO=AFmmF2swRQIgUcIMayVHHAcja6ICusVoQwyanZYf6wxtPEbxny9Cc6UCIQDawm5yi4lccc8OqIdkOKJojrwO0mPFxIydnialhEOclQ:QUQ3MjNmelJ5UW9Jd0hxREVKTDFiZV9IbmtKUnJfVjlTdlJCTWV2eHVibHROa3o1dnlIU0pfZjVXaXpZWWZ0M18yU01ITUpYdnFGU0d1dHFCeVNPVkdqMGs3b2RueHBrYW1lUFFUNEFENGtIR0RkaFBYWDdmREIxQmhpSF9ub19RdTZJMWlKck8xUFpYZEFmR3JaN3RKNzVWaW5QRExOcEFR",
    "VISITOR_INFO1_LIVE=yu45mqgMcIE",
    "YSC=Q4z1MqDEqvA",
    "PREF=tz=Asia.Jakarta",
    "GPS=1",
    "VISITOR_PRIVACY_METADATA=CgJJRBIEGgAgVw%3D%3D",
    "__Secure-1PSIDTS=sidts-CjUBflaCdbP7GKcLvTnFrlDwgK1Ta5nMsU9dlQGl2HvQ0IyVg_bxFAwVC6onduE4K74z43gcDRAA",
    "__Secure-3PSIDTS=sidts-CjUBflaCdbP7GKcLvTnFrlDwgK1Ta5nMsU9dlQGl2HvQ0IyVg_bxFAwVC6onduE4K74z43gcDRAA",
    "SIDCC=AKEyXzVXrpBFqSKvwE6s4uFY-tvSIfO2xhLB5RiQIH467jGRnJCAP9rzwzqiIEwdHEJRn0CJ",
    "__Secure-1PSIDCC=AKEyXzV8FkRI5Qa7eoaL9R4aDEzhJVHvNYANFFV7AC4D2saTe1SMSznaJapz2Njj4HeMM91riw",
    "__Secure-3PSIDCC=AKEyXzXPqs_GprZ_p8YEclyITldUTrjwQQEwxaVmf1ByUJYCOl8dY93vw0q9O8LemKmWut3s"
].join("; ");

// ═══════════════════════════════════════════════════════════════
// INITIALIZE PLAY-DL WITH COOKIES
// ═══════════════════════════════════════════════════════════════
async function initializePlayDl() {
    try {
        console.log('🍪 Setting YouTube cookies...');
        
        await play.setToken({
            youtube: {
                cookie: YOUTUBE_COOKIES
            }
        });
        
        console.log('✅ YouTube cookies loaded successfully!');
        
        // Validate cookies
        if (play.is_expired()) {
            console.log('⚠️ Token expired, attempting refresh...');
            await play.refreshToken();
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to set cookies:', error.message);
        return false;
    }
}

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
// MUSIC QUEUE
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
// SEARCH FUNCTION WITH RETRY
// ═══════════════════════════════════════════════════════════════
async function searchSong(query, requestedBy) {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔍 Search attempt ${attempt}: ${query}`);
            
            let songInfo = null;

            // Check jika URL YouTube
            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                const validated = await play.validate(query);
                
                if (validated === 'yt_video') {
                    const videoInfo = await play.video_info(query);
                    songInfo = {
                        title: videoInfo.video_details.title,
                        url: videoInfo.video_details.url,
                        duration: videoInfo.video_details.durationRaw,
                        thumbnail: videoInfo.video_details.thumbnails?.[0]?.url,
                        requestedBy: requestedBy
                    };
                }
            }

            // Search by title
            if (!songInfo) {
                const searchResult = await play.search(query, { 
                    limit: 5,
                    source: { youtube: 'video' }
                });
                
                if (searchResult.length > 0) {
                    const video = searchResult[0];
                    songInfo = {
                        title: video.title,
                        url: video.url,
                        duration: video.durationRaw,
                        thumbnail: video.thumbnails?.[0]?.url,
                        requestedBy: requestedBy
                    };
                }
            }

            if (songInfo) {
                console.log(`✅ Found: ${songInfo.title}`);
                return songInfo;
            }

            throw new Error('No results found');

        } catch (error) {
            console.error(`❌ Search attempt ${attempt} failed:`, error.message);
            
            // Jika error karena bot detection
            if (error.message.includes('Sign in') || error.message.includes('confirm') || error.message.includes('bot')) {
                console.log('🔄 Refreshing cookies...');
                await initializePlayDl();
                await new Promise(r => setTimeout(r, 2000 * attempt));
            }
            
            if (attempt === maxRetries) {
                throw error;
            }
        }
    }
    
    return null;
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

    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`▶️ Playing (attempt ${attempt}): ${song.title}`);

            // Check & refresh if expired
            if (play.is_expired()) {
                console.log('🔄 Token expired, refreshing...');
                await play.refreshToken();
            }

            // Get audio stream
            const stream = await play.stream(song.url, {
                quality: 2,
                discordPlayerCompatibility: true
            });
            
            // Create audio resource
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
                inlineVolume: true
            });
            
            resource.volume?.setVolume(queue.volume / 100);

            // Play
            queue.player.play(resource);

            // Now playing embed
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

            return; // Success

        } catch (error) {
            console.error(`❌ Play attempt ${attempt} failed:`, error.message);
            
            if (error.message.includes('Sign in') || error.message.includes('confirm') || error.message.includes('bot')) {
                console.log('🔄 Re-initializing cookies...');
                await initializePlayDl();
                await new Promise(r => setTimeout(r, 3000 * attempt));
            }
            
            if (attempt === maxRetries) {
                if (queue.channel) {
                    queue.channel.send(`❌ Gagal memutar **${song.title}**\nSkipping...`).catch(() => {});
                }
                queue.songs.shift();
                playSong(guildId);
                return;
            }
        }
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
        .setDescription('Check bot ping'),
    new SlashCommandBuilder()
        .setName('refresh')
        .setDescription('Refresh YouTube cookies')
].map(c => c.toJSON());

// ═══════════════════════════════════════════════════════════════
// BOT READY
// ═══════════════════════════════════════════════════════════════
client.once(Events.ClientReady, async (c) => {
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Bot online: ${c.user.tag}`);
    console.log(`📊 Servers: ${c.guilds.cache.size}`);
    console.log('═══════════════════════════════════════════');

    // Initialize play-dl dengan cookies
    await initializePlayDl();

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

    // /ping
    if (commandName === 'ping') {
        return interaction.reply(`🏓 Pong! ${client.ws.ping}ms`);
    }

    // /refresh - Manual refresh cookies
    if (commandName === 'refresh') {
        await interaction.deferReply();
        const success = await initializePlayDl();
        if (success) {
            return interaction.editReply('✅ YouTube cookies refreshed!');
        } else {
            return interaction.editReply('❌ Failed to refresh cookies');
        }
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

    // /play
    if (commandName === 'play') {
        const query = options.getString('song');
        await interaction.deferReply();

        try {
            const songInfo = await searchSong(query, interaction.user.username);
            
            if (!songInfo) {
                return interaction.editReply(`❌ Tidak ditemukan: **${query}**`);
            }

            const queue = getQueue(guild.id);
            queue.channel = channel;
            queue.songs.push(songInfo);

            // Join voice channel
            if (!queue.connection || queue.connection.state.status === VoiceConnectionStatus.Destroyed) {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: true
                });

                queue.connection = connection;
                queue.player = createAudioPlayer();
                connection.subscribe(queue.player);

                queue.player.on(AudioPlayerStatus.Idle, () => {
                    queue.songs.shift();
                    playSong(guild.id);
                });

                queue.player.on('error', (error) => {
                    console.error('❌ Player error:', error);
                    queue.songs.shift();
                    playSong(guild.id);
                });

                connection.on(VoiceConnectionStatus.Disconnected, async () => {
                    try {
                        await Promise.race([
                            entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                            entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                        ]);
                    } catch {
                        connection.destroy();
                        queues.delete(guild.id);
                    }
                });
            }

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
            console.error('❌ Play command error:', error);
            return interaction.editReply(`❌ Error: ${error.message}`);
        }
    }

    // /skip
    if (commandName === 'skip') {
        const queue = getQueue(guild.id);
        if (queue.songs.length === 0) {
            return interaction.reply({ content: '❌ Tidak ada lagu!', ephemeral: true });
        }
        queue.player?.stop();
        return interaction.reply('⏭️ Skipped!');
    }

    // /stop
    if (commandName === 'stop') {
        const queue = getQueue(guild.id);
        queue.songs = [];
        queue.playing = false;
        queue.player?.stop();
        queue.connection?.destroy();
        queues.delete(guild.id);
        return interaction.reply('⏹️ Stopped!');
    }

    // /pause
    if (commandName === 'pause') {
        const queue = getQueue(guild.id);
        if (!queue.playing) {
            return interaction.reply({ content: '❌ Tidak ada lagu!', ephemeral: true });
        }
        queue.player?.pause();
        return interaction.reply('⏸️ Paused!');
    }

    // /resume
    if (commandName === 'resume') {
        const queue = getQueue(guild.id);
        queue.player?.unpause();
        return interaction.reply('▶️ Resumed!');
    }

    // /queue
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

    // /np
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

    // /volume
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
console.log('🚀 Starting Discord Music Bot v5.1 with Cookies...');
console.log('');

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN tidak ditemukan!');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
