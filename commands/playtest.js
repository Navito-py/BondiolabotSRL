const { SlashCommandBuilder } = require("discord.js");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    getVoiceConnection,
} = require("@discordjs/voice");

const path = require("path");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("playtest")
        .setDescription("music test command with local file"),

    async execute(interaction) {
        const channel = interaction.member.voice.channel;

        if (!channel) {
            return interaction.reply({
                content: "Tenés que estar en un canal de voz boludito",
                ephemeral: true
            });
        }

        let connection = getVoiceConnection(channel.guild.id);

        if (!connection) {
            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
        }

        const player = createAudioPlayer();
        const filePath = path.join(__dirname, "../audio/song.mp3");
        const resource = createAudioResource(filePath);

        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Idle, () => {
            player.stop();
        });

        await interaction.reply("Reproduciendo música");
    }
};