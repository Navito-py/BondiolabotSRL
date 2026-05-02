const { SlashCommandBuilder } = require("discord.js");
const { resumeQueue } = require("../musicQueue");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resume")
        .setDescription("Reanuda la cancion pausada"),

    async execute(interaction) {
        const result = resumeQueue(interaction.guild.id);

        if (!result.ok && result.reason === "empty") {
            return interaction.reply({
                content: "No hay musica para reanudar.",
                ephemeral: true
            });
        }

        if (!result.ok && result.reason === "not_paused") {
            return interaction.reply({
                content: "La reproduccion no esta pausada.",
                ephemeral: true
            });
        }

        await interaction.reply("Reanudando: " + result.song.title);
    }
};
