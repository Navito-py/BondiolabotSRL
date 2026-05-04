const { SlashCommandBuilder } = require("discord.js");
const { enqueue } = require("../musicQueue");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Reproduce musica de YouTube")
        .addStringOption(option =>
            option.setName("url-name")
                .setDescription("URL de YouTube o texto para buscar")
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.editReply("Tenes que estar en un canal de voz");
        }

        const url = interaction.options.getString("url-name");
        const result = await enqueue(interaction.guild.id, channel, url, interaction.user.username);
        const songName = result.song.isSearch ? `busqueda: ${result.song.title}` : result.song.title;

        if (result.started) {
            await interaction.editReply("PRENDEMO EL BULLERO!!! CON EL TEMON: " + songName);
        } else {
            await interaction.editReply("Agregado a la cola en la posicion " + result.position + ": " + songName);
        }
    }
};
