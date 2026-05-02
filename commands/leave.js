const { SlashCommandBuilder } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leave")
        .setDescription("disconnect from the voice channel"),

    async execute(interaction) {
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