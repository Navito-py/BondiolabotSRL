const { SlashCommandBuilder } = require("discord.js");
const { getQueueSnapshot } = require("../musicQueue");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Muestra la cancion actual y la cola"),

    async execute(interaction) {
        const snapshot = getQueueSnapshot(interaction.guild.id);

        if (!snapshot.ok) {
            return interaction.reply({
                content: "La cola esta vacia.",
                ephemeral: true
            });
        }

        const lines = [
            "Sonando ahora: " + formatSong(snapshot.current),
            "Estado: " + snapshot.status
        ];

        if (snapshot.upcoming.length === 0) {
            lines.push("No hay mas canciones en cola.");
        } else {
            lines.push("Proximas canciones:");
            lines.push(...snapshot.upcoming.slice(0, 10).map((song, index) => `${index + 1}. ${formatSong(song)}`));

            if (snapshot.upcoming.length > 10) {
                lines.push(`Y ${snapshot.upcoming.length - 10} mas...`);
            }
        }

        await interaction.reply(lines.join("\n"));
    }
};

function formatSong(song) {
    const requestedBy = song.requestedBy ? ` - pedida por ${song.requestedBy}` : "";
    const prefix = song.isSearch ? "Busqueda: " : "";

    return prefix + song.title + requestedBy;
}
