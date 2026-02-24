import { isChannelAllowed } from "../../storage/channel-config.js";
export async function checkChannelPermission(interaction, feature) {
    if (!interaction.guildId)
        return true;
    const allowed = await isChannelAllowed(interaction.guildId, interaction.channelId, feature);
    if (!allowed) {
        let message = "❌ Este comando não pode ser usado neste canal.";
        switch (feature) {
            case "admin_commands_channel":
                message =
                    "⚙️ Comandos administrativos só podem ser usados no canal configurado.";
                break;
            case "rank_channel":
                message =
                    "🏆 O comando de ranking só pode ser usado no canal configurado.";
                break;
            case "embeds_channel":
                message = "📢 Embeds só podem ser enviados no canal configurado.";
                break;
            case "bot_commands_channels":
                message = "🤖 Este comando só pode ser usado nos canais permitidos.";
                break;
        }
        await interaction.reply({
            content: message,
            ephemeral: true,
        });
    }
    return allowed;
}
export async function checkAdminChannelPermission(interaction) {
    return await checkChannelPermission(interaction, "admin_commands_channel");
}
export async function checkGeneralChannelPermission(interaction) {
    return await checkChannelPermission(interaction, "bot_commands_channels");
}
