const { SlashCommandBuilder } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("join")
        .setDescription("connect to the voice channel you are in"),

    async execute(interaction) {
        const channel = interaction.member.voice.channel;

        if (!channel) {
            return interaction.reply({
                content: "you must be in a voice channel to use this command",
                ephemeral: true
            });
        }

        joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        await interaction.reply(`🎧 Conectado a **${channel.name}**`);
    }
};