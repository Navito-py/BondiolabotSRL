const { SlashCommandBuilder } = require("discord.js");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    getVoiceConnection,
    AudioPlayerStatus,
    entersState,
    VoiceConnectionStatus
} = require("@discordjs/voice");
const { spawn } = require("child_process");
const path = require("path");

const queues = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Reproduce música de YouTube")
        .addStringOption(option =>
            option.setName("url")
                .setDescription("URL del video de YouTube")
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.editReply("Tenés que estar en un canal de voz");
        }

        const url = interaction.options.getString("url");
        const guildId = interaction.guild.id;

        let queue = queues.get(guildId);

        if (!queue) {
            let connection = getVoiceConnection(guildId);
            if (!connection) {
                connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: guildId,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                });

                await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
            }

            const player = createAudioPlayer();

            queue = {
                connection,
                player,
                songs: []
            };

            queues.set(guildId, queue);

            queue.songs.push(url);

            playNext(guildId);

            await interaction.editReply("PRENDEMO EL BULLERO!!! CON EL TEMON: " + url);
        } else {
            queue.songs.push(url);
            await interaction.editReply("➕ Agregado a la cola: " + url);
        }
    }
};

function playNext(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return;

    const song = queue.songs[0];

    if (!song) {
        queue.connection.destroy();
        queues.delete(guildId);
        return;
    }

    const ytdlpPath = path.join(process.cwd(), "yt-dlp.exe");

    const yt = spawn(ytdlpPath, [
        "-f", "bestaudio",
        "-o", "-",
        "--no-playlist",
        song
    ]);

    yt.stderr.on("data", data => {
        console.error(`yt-dlp error: ${data}`);
    });

    const resource = createAudioResource(yt.stdout);

    queue.player.play(resource);
    queue.connection.subscribe(queue.player);

    queue.player.once(AudioPlayerStatus.Idle, () => {
        queue.songs.shift();
        playNext(guildId);
    });

    queue.player.on("error", error => {
        console.error("Error:", error);
        queue.songs.shift();
        playNext(guildId);
    });
}