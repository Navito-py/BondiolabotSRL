const { SlashCommandBuilder } = require("discord.js");
const { skipQueue } = require("../musicQueue");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Pasa a la siguiente cancion de la cola"),

    async execute(interaction) {
        const result = skipQueue(interaction.guild.id);

        if (!result.ok && result.reason === "empty") {
            return interaction.reply({
                content: "No hay musica reproduciendose.",
                ephemeral: true
            });
        }

        if (!result.ok && result.reason === "no_next") {
            return interaction.reply({
                content: "No hay una siguiente cancion en la cola.",
                ephemeral: true
            });
        }

        await interaction.reply("Saltando a la siguiente cancion: " + result.next.title);
    }
};
