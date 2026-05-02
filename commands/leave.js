const { SlashCommandBuilder } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");
const { destroyQueue } = require("../musicQueue");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leave")
        .setDescription("disconnect from the voice channel"),

    async execute(interaction) {
        const queueDestroyed = destroyQueue(interaction.guild.id);

        if (queueDestroyed) {
            return interaction.reply("Nos re vimos gil");
        }

        const connection = getVoiceConnection(interaction.guild.id);

        if (!connection) {
            return interaction.reply({
                content: "I'm not connected to any voice channel culiado",
                ephemeral: true
            });
        }

        connection.destroy();

        await interaction.reply("Nos re vimos gil");
    }
};
