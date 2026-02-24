import { MessageFlags } from "discord.js";
export async function handlePing(interaction) {
    try {
        await interaction.reply({
            content: "Pong!",
            flags: MessageFlags.Ephemeral,
        });
    }
    catch (error) {
        console.error("Erro no comando ping:", error);
        await interaction
            .reply({
            content: "❌ Erro ao executar comando.",
            flags: MessageFlags.Ephemeral,
        })
            .catch(() => { });
    }
}
