const { Client, GatewayIntentBits, Events, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActivityType } = require('discord.js');
const { Player } = require('discord-player');
const express = require('express');

// ═══════════════════════════════════════════════════════════════
// EXPRESS SERVER
// ═══════════════════════════════════════════════════════════════
const app = express();
app.get('/', (req, res) => res.send('🎵 Bot Online!'));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(process.env.PORT || 3000, () => console.log('🌐 Server ready'));

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
// MUSIC PLAYER
// ═══════════════════════════════════════════════════════════════
const player = new Player(client, {
    skipFFmpeg: false
});

player.extractors.loadDefault().then(() => {
    console.log('✅ Extractors loaded');
});

// ═══════════════════════════════════════════════════════════════
// PLAYER EVENTS
// ═══════════════════════════════════════════════════════════════
player.events.on('playerStart', (queue, track) => {
    console.log(`▶️ Now playing: ${track.title}`);
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎵 Now Playing')
        .setDescription(`**${track.title}**`)
        .addFields(
            { name: 'Artist', value: track.author || 'Unknown', inline: true },
            { name: 'Duration', value: track.duration || '0:00', inline: true }
        )
        .setThumbnail(track.thumbnail || null);

    if (queue.metadata?.channel) {
        queue.metadata.channel.send({ embeds: [embed] }).catch(() => {});
    }
});

player.events.on('playerError', (queue, error) => {
    console.error('❌ Player Error:', error.message);
    if (queue.metadata?.channel) {
        queue.metadata.channel.send(`❌ Error: ${error.message}`).catch(() => {});
    }
});

player.events.on('error', (queue, error) => {
    console.error('❌ Queue Error:', error.message);
});

player.events.on('emptyQueue', (queue) => {
    console.log('📭 Queue empty');
    if (queue.metadata?.channel) {
        queue.metadata.channel.send('✅ Queue finished!').catch(() => {});
    }
});

// ═══════════════════════════════════════════════════════════════
// SLASH COMMANDS
// ═══════════════════════════════════════════════════════════════
const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music')
        .addStringOption(o => o.setName('song').setDescription('Song name').setRequired(true)),
    new SlashCommandBuilder().setName('skip').setDescription('Skip song'),
    new SlashCommandBuilder().setName('stop').setDescription('Stop music'),
    new SlashCommandBuilder().setName('pause').setDescription('Pause'),
    new SlashCommandBuilder().setName('resume').setDescription('Resume'),
    new SlashCommandBuilder().setName('queue').setDescription('View queue'),
    new SlashCommandBuilder().setName('np').setDescription('Now playing'),
    new SlashCommandBuilder()
        .setName('vol')
        .setDescription('Volume')
        .addIntegerOption(o => o.setName('level').setDescription('0-100').setRequired(true)),
    new SlashCommandBuilder().setName('ping').setDescription('Ping')
].map(c => c.toJSON());

// ═══════════════════════════════════════════════════════════════
// BOT READY
// ═══════════════════════════════════════════════════════════════
client.once(Events.ClientReady, async (c) => {
    console.log(`✅ ${c.user.tag} online!`);
    
    client.user.setPresence({
        activities: [{ name: '/play', type: ActivityType.Listening }],
        status: 'online'
    });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
        console.log('✅ Commands registered');
    } catch (e) {
        console.error('❌ Command error:', e);
    }
});

// ═══════════════════════════════════════════════════════════════
// COMMAND HANDLER
// ═══════════════════════════════════════════════════════════════
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, member, guild, channel } = interaction;
    const vc = member?.voice?.channel;

    // PING
    if (commandName === 'ping') {
        return interaction.reply(`🏓 Pong! ${client.ws.ping}ms`);
    }

    // Voice check
    if (['play', 'skip', 'stop', 'pause', 'resume', 'vol'].includes(commandName)) {
        if (!vc) {
            return interaction.reply({ content: '❌ Join voice channel first!', ephemeral: true });
        }
    }

    // PLAY
    if (commandName === 'play') {
        const song = options.getString('song');
        
        await interaction.deferReply();

        try {
            console.log(`🔍 Searching: ${song}`);

            const result = await player.search(song, {
                requestedBy: interaction.user
            });

            if (!result.hasTracks()) {
                console.log('❌ No tracks found');
                return interaction.editReply(`❌ Not found: **${song}**\n\n💡 Try searching with song title instead of URL`);
            }

            console.log(`✅ Found: ${result.tracks[0].title}`);

            await player.play(vc, result, {
                nodeOptions: {
                    metadata: { channel, guild },
                    volume: 50,
                    leaveOnEmpty: false,
                    leaveOnEnd: false,
                    leaveOnStop: false,
                    selfDeaf: true
                }
            });

            const track = result.tracks[0];
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Added to Queue')
                .setDescription(`**${track.title}**`)
                .addFields(
                    { name: 'Duration', value: track.duration || '0:00', inline: true },
                    { name: 'Artist', value: track.author || 'Unknown', inline: true }
                )
                .setThumbnail(track.thumbnail || null);

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Play error:', error);
            return interaction.editReply(`❌ Error: ${error.message}`);
        }
    }

    // SKIP
    if (commandName === 'skip') {
        const queue = player.nodes.get(guild.id);
        if (!queue?.isPlaying()) {
            return interaction.reply({ content: '❌ Nothing playing', ephemeral: true });
        }
        queue.node.skip();
        return interaction.reply('⏭️ Skipped!');
    }

    // STOP
    if (commandName === 'stop') {
        const queue = player.nodes.get(guild.id);
        if (!queue) {
            return interaction.reply({ content: '❌ Nothing playing', ephemeral: true });
        }
        queue.delete();
        return interaction.reply('⏹️ Stopped!');
    }

    // PAUSE
    if (commandName === 'pause') {
        const queue = player.nodes.get(guild.id);
        if (!queue?.isPlaying()) {
            return interaction.reply({ content: '❌ Nothing playing', ephemeral: true });
        }
        queue.node.pause();
        return interaction.reply('⏸️ Paused!');
    }

    // RESUME
    if (commandName === 'resume') {
        const queue = player.nodes.get(guild.id);
        if (!queue) {
            return interaction.reply({ content: '❌ Nothing playing', ephemeral: true });
        }
        queue.node.resume();
        return interaction.reply('▶️ Resumed!');
    }

    // QUEUE
    if (commandName === 'queue') {
        const queue = player.nodes.get(guild.id);
        if (!queue?.currentTrack) {
            return interaction.reply({ content: '❌ Queue empty', ephemeral: true });
        }

        const current = queue.currentTrack;
        const tracks = queue.tracks.map((t, i) => `${i + 1}. ${t.title}`).slice(0, 5).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📋 Queue')
            .addFields(
                { name: '🎵 Now', value: current.title },
                { name: `Next (${queue.tracks.size})`, value: tracks || 'Empty' }
            );

        return interaction.reply({ embeds: [embed] });
    }

    // NOW PLAYING
    if (commandName === 'np') {
        const queue = player.nodes.get(guild.id);
        if (!queue?.currentTrack) {
            return interaction.reply({ content: '❌ Nothing playing', ephemeral: true });
        }

        const track = queue.currentTrack;
        const progress = queue.node.createProgressBar();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎵 Now Playing')
            .setDescription(`**${track.title}**`)
            .addFields({ name: 'Progress', value: progress || '▬▬▬▬▬▬▬▬▬▬' })
            .setThumbnail(track.thumbnail || null);

        return interaction.reply({ embeds: [embed] });
    }

    // VOLUME
    if (commandName === 'vol') {
        const queue = player.nodes.get(guild.id);
        if (!queue) {
            return interaction.reply({ content: '❌ Nothing playing', ephemeral: true });
        }
        const vol = options.getInteger('level');
        queue.node.setVolume(vol);
        return interaction.reply(`🔊 Volume: ${vol}%`);
    }
});

// ═══════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════
console.log('🚀 Starting bot...');

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ No DISCORD_TOKEN!');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
