import { getPerfilOuPadrao } from "../../storage/perfil.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, MessageFlags, } from "discord.js";
function formatarBadges(badges) {
    if (badges.length === 0)
        return "Nenhum badge";
    const badgesLimitados = badges.slice(0, 4);
    return badgesLimitados
        .map((badge) => `![${badge.nome}](${badge.imageUrl})`)
        .join(" ");
}
function isValidHexColor(color) {
    return /^#[\da-f]{6}$/i.test(color);
}
export async function handlePerfil(interaction) {
    try {
        const usuario = interaction.options.getUser("usuario") || interaction.user;
        const membro = await interaction.guild?.members.fetch(usuario.id);
        if (!membro) {
            await interaction.reply({
                content: "Usuário não encontrado.",
                ephemeral: true,
            });
            return;
        }
        const perfil = await getPerfilOuPadrao(usuario.id);
        let cargos;
        const cache = membro.roles?.cache;
        if (cache && typeof cache.filter === "function") {
            const c = cache;
            cargos = c
                .filter((r) => r.id !== interaction.guild?.id)
                .sort((a, b) => (b.position ?? 0) - (a.position ?? 0))
                .first(2);
        }
        else {
            const hasIterator = cache &&
                typeof cache === "object" &&
                Symbol.iterator in cache &&
                typeof cache[Symbol.iterator] ===
                    "function";
            const arr = (hasIterator
                ? Array.from(cache)
                : Array.isArray(cache)
                    ? cache
                    : cache && typeof cache === "object"
                        ? Object.values(cache)
                        : []);
            cargos = arr
                .filter((r) => r?.id && r.id !== interaction.guild?.id)
                .sort((a, b) => (b?.position ?? 0) - (a?.position ?? 0))
                .slice(0, 2);
        }
        const corFundo = isValidHexColor(perfil.aparencia.corFundo)
            ? perfil.aparencia.corFundo
            : "#5865F2";
        const embed = new EmbedBuilder().setTitle(`Perfil de ${usuario.username}`);
        const thumbUrl = typeof usuario
            .displayAvatarURL === "function"
            ? usuario.displayAvatarURL()
            : undefined;
        if (thumbUrl)
            embed.setThumbnail(thumbUrl);
        embed
            .addFields([
            { name: "Bio", value: perfil.bio || "Não informado", inline: false },
            {
                name: "Área de atuação",
                value: perfil.area || "Não informado",
                inline: true,
            },
            {
                name: "Emblemas",
                value: perfil.emblemas?.join(", ") || "Nenhum",
                inline: true,
            },
            { name: "Badges", value: formatarBadges(perfil.badges), inline: false },
            {
                name: "Cargos",
                value: cargos.map((c) => `<@&${c.id}>`).join(", ") || "Nenhum",
                inline: false,
            },
        ])
            .setColor(corFundo);
        if (perfil.aparencia.imagemFundo) {
            embed.setImage(perfil.aparencia.imagemFundo);
        }
        const botoes = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId("perfil_rank")
            .setLabel("Ver Rank")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🏅"), new ButtonBuilder()
            .setCustomId("perfil_refresh")
            .setLabel("Atualizar")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("🔄"));
        if (usuario.id === interaction.user.id) {
            botoes.addComponents(new ButtonBuilder()
                .setCustomId("perfil_edit")
                .setLabel("Editar")
                .setStyle(ButtonStyle.Success)
                .setEmoji("✏️"));
        }
        const payload = {
            embeds: [embed],
            components: [botoes],
            fetchReply: true,
        };
        const response = interaction.replied || interaction.deferred
            ? await interaction.editReply(payload)
            : await interaction.reply(payload);
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
        });
        collector.on("collect", async (i) => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({
                    content: "❌ Apenas quem solicitou pode interagir.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            if (i.customId === "perfil_rank") {
                await i.reply({
                    content: `Use \`/rank usuario:@${usuario.username}\` para ver o rank completo!`,
                    flags: MessageFlags.Ephemeral,
                });
            }
            else if (i.customId === "perfil_refresh") {
                await i.deferUpdate();
                const perfilAtualizado = await getPerfilOuPadrao(usuario.id);
                const embedAtualizado = new EmbedBuilder().setTitle(`Perfil de ${usuario.username}`);
                if (thumbUrl)
                    embedAtualizado.setThumbnail(thumbUrl);
                embedAtualizado
                    .addFields([
                    {
                        name: "Bio",
                        value: perfilAtualizado.bio || "Não informado",
                        inline: false,
                    },
                    {
                        name: "Área de atuação",
                        value: perfilAtualizado.area || "Não informado",
                        inline: true,
                    },
                    {
                        name: "Emblemas",
                        value: perfilAtualizado.emblemas?.join(", ") || "Nenhum",
                        inline: true,
                    },
                    {
                        name: "Badges",
                        value: formatarBadges(perfilAtualizado.badges),
                        inline: false,
                    },
                    {
                        name: "Cargos",
                        value: cargos.map((c) => `<@&${c.id}>`).join(", ") || "Nenhum",
                        inline: false,
                    },
                ])
                    .setColor(corFundo)
                    .setFooter({ text: "Atualizado" })
                    .setTimestamp();
                if (perfilAtualizado.aparencia.imagemFundo) {
                    embedAtualizado.setImage(perfilAtualizado.aparencia.imagemFundo);
                }
                await interaction.editReply({
                    embeds: [embedAtualizado],
                    components: [botoes],
                });
            }
            else if (i.customId === "perfil_edit") {
                await i.reply({
                    content: "✏️ Para editar seu perfil:\n\n" +
                        "• Faça o quiz de perfil: \`/publicar-quiz-perfil\` (se disponível)\n" +
                        "• Ou acesse o painel administrativo no navegador\n" +
                        "• Entre em contato com um administrador para configurações avançadas",
                    flags: MessageFlags.Ephemeral,
                });
            }
        });
        collector.on("end", async () => {
            try {
                const refreshRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
                    .setCustomId("perfil_refresh")
                    .setLabel("Atualizar")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("🔄"), new ButtonBuilder()
                    .setCustomId("perfil_rank")
                    .setLabel("Ver Rank")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("🏅"));
                await interaction.editReply({ components: [refreshRow] });
            }
            catch {
            }
        });
    }
    catch (error) {
        console.error("Erro no comando perfil:", error);
        await interaction
            .reply({
            content: "❌ Erro ao buscar perfil do usuário.",
            ephemeral: true,
        })
            .catch(() => { });
    }
}
