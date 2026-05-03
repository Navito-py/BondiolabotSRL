const { SlashCommandBuilder } = require("discord.js");
const { clearQueue } = require("../musicQueue");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Detiene la reproduccion y limpia la cola"),

    async execute(interaction) {
        const result = clearQueue(interaction.guild.id);

        if (!result.ok) {
            return interaction.reply({
                content: "No hay musica reproduciendose ni canciones en cola.",
                ephemeral: true
            });
        }

        await interaction.reply("Reproduccion detenida y cola limpiada. Sigo conectado al canal.");
    }
};
