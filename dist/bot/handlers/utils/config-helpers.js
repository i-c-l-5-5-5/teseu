import { ChannelType, EmbedBuilder, } from "discord.js";
const NAO_CONFIGURADO = "`Não configurado`";
export function labelPorCampo(field) {
    const map = {
        embeds_channel: "Embeds/Anúncios",
        perfil_quiz_channel: "Quiz de Perfil",
        squad_quiz_channel: "Quiz de Squads",
        admin_commands_channel: "Comandos Admin",
        level_up_channel: "Level Up",
        rank_channel: "Ranking",
    };
    return map[field] ?? field;
}
export async function mapearCanaisTexto(interaction) {
    const { guild } = interaction;
    const opts = [];
    if (!guild)
        return opts;
    const canais = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText);
    canais.forEach((canal) => {
        opts.push({
            label: canal.name,
            value: canal.id,
            description: `Usar #${canal.name}`,
        });
    });
    return opts;
}
export function resumoConfiguracoesEmbed(config) {
    const eb = new EmbedBuilder()
        .setTitle("✅ Configurações aplicadas")
        .setColor("#00FF00");
    eb.addFields([
        {
            name: "📢 Embeds",
            value: config.embeds_channel
                ? `<#${config.embeds_channel}>`
                : NAO_CONFIGURADO,
            inline: true,
        },
        {
            name: "🎯 Quiz Perfil",
            value: config.perfil_quiz_channel
                ? `<#${config.perfil_quiz_channel}>`
                : NAO_CONFIGURADO,
            inline: true,
        },
        {
            name: "🧩 Quiz Squads",
            value: config.squad_quiz_channel
                ? `<#${config.squad_quiz_channel}>`
                : NAO_CONFIGURADO,
            inline: true,
        },
        {
            name: "⚙️ Admin",
            value: config.admin_commands_channel
                ? `<#${config.admin_commands_channel}>`
                : NAO_CONFIGURADO,
            inline: true,
        },
        {
            name: "📈 Level Up",
            value: config.level_up_channel
                ? `<#${config.level_up_channel}>`
                : NAO_CONFIGURADO,
            inline: true,
        },
        {
            name: "🏆 Ranking",
            value: config.rank_channel
                ? `<#${config.rank_channel}>`
                : NAO_CONFIGURADO,
            inline: true,
        },
    ]);
    return eb;
}
