const { SlashCommandBuilder } = require("discord.js");
const { pauseQueue } = require("../musicQueue");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pause")
        .setDescription("Pausa la cancion actual"),

    async execute(interaction) {
        const result = pauseQueue(interaction.guild.id);

        if (!result.ok && result.reason === "empty") {
            return interaction.reply({
                content: "No hay musica reproduciendose.",
                ephemeral: true
            });
        }

        if (!result.ok && result.reason === "already_paused") {
            return interaction.reply({
                content: "La reproduccion ya esta pausada.",
                ephemeral: true
            });
        }

        if (!result.ok) {
            return interaction.reply({
                content: "No pude pausar la reproduccion actual.",
                ephemeral: true
            });
        }

        await interaction.reply("Pausado: " + result.song.title);
    }
};
