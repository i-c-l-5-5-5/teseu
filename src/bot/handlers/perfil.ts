import { getPerfilOuPadrao } from "@storage/perfil.js";
import type { ChatInputCommandInteraction, Collection, Role } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";

/**
 * Formata badges para exibição no embed
 */
function formatarBadges(
  badges: Array<{ imageUrl: string; nome: string; descricao?: string }>,
): string {
  if (badges.length === 0) return "Nenhum badge";

  // Limitar a 4 badges para não poluir o embed
  const badgesLimitados = badges.slice(0, 4);

  // Criar links de imagem lado a lado
  return badgesLimitados
    .map((badge) => `![${badge.nome}](${badge.imageUrl})`)
    .join(" ");
}

/**
 * Valida se a cor é um hex válido
 */
function isValidHexColor(color: string): boolean {
  return /^#[\da-f]{6}$/i.test(color);
}

export async function handlePerfil(interaction: ChatInputCommandInteraction) {
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

    // Buscar dados customizados do perfil com valores padrão
    const perfil = await getPerfilOuPadrao(usuario.id);

    // Cargos: pegar os dois mais altos (tolerante a mocks/ambientes sem Collection)
    let cargos: Array<{ id: string; position: number }>;
    const cache: unknown = (
      membro as unknown as { roles?: { cache?: unknown } }
    ).roles?.cache;
    if (cache && typeof (cache as { filter?: unknown }).filter === "function") {
      const c = cache as Collection<string, Role>;
      cargos = c
        .filter((r: Role) => r.id !== interaction.guild?.id)
        .sort((a: Role, b: Role) => (b.position ?? 0) - (a.position ?? 0))
        .first(2);
    } else {
      // Fallback: tentar converter para array e ordenar
      const hasIterator =
        cache &&
        typeof cache === "object" &&
        Symbol.iterator in cache &&
        typeof (cache as { [Symbol.iterator]: unknown })[Symbol.iterator] ===
          "function";
      const arr = (
        hasIterator
          ? Array.from(cache as Iterable<Role>)
          : Array.isArray(cache)
            ? cache
            : cache && typeof cache === "object"
              ? Object.values(cache as Record<string, Role>)
              : []
      ) as Role[];
      cargos = arr
        .filter((r) => r?.id && r.id !== interaction.guild?.id)
        .sort((a, b) => (b?.position ?? 0) - (a?.position ?? 0))
        .slice(0, 2);
    }

    // Validar cor de fundo
    const corFundo = isValidHexColor(perfil.aparencia.corFundo)
      ? (perfil.aparencia.corFundo as `#${string}`)
      : ("#5865F2" as const);

    // Montar embed
    const embed = new EmbedBuilder().setTitle(`Perfil de ${usuario.username}`);

    const thumbUrl =
      typeof (usuario as unknown as { displayAvatarURL?: () => string })
        .displayAvatarURL === "function"
        ? (
            usuario as unknown as { displayAvatarURL: () => string }
          ).displayAvatarURL()
        : undefined;
    if (thumbUrl) embed.setThumbnail(thumbUrl);

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

    // Adicionar imagem de fundo se configurada
    if (perfil.aparencia.imagemFundo) {
      embed.setImage(perfil.aparencia.imagemFundo);
    }

    const botoes = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("perfil_rank")
        .setLabel("Ver Rank")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🏅"),
      new ButtonBuilder()
        .setCustomId("perfil_refresh")
        .setLabel("Atualizar")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔄"),
    );

    // Se for o próprio usuário, adicionar botão de editar
    if (usuario.id === interaction.user.id) {
      botoes.addComponents(
        new ButtonBuilder()
          .setCustomId("perfil_edit")
          .setLabel("Editar")
          .setStyle(ButtonStyle.Success)
          .setEmoji("✏️"),
      );
    }

    const payload = {
      embeds: [embed],
      components: [botoes],
      fetchReply: true,
    } as const;
    const response =
      interaction.replied || interaction.deferred
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
      } else if (i.customId === "perfil_refresh") {
        await i.deferUpdate();
        // Recarregar perfil atualizado
        const perfilAtualizado = await getPerfilOuPadrao(usuario.id);
        const embedAtualizado = new EmbedBuilder().setTitle(
          `Perfil de ${usuario.username}`,
        );

        if (thumbUrl) embedAtualizado.setThumbnail(thumbUrl);

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
      } else if (i.customId === "perfil_edit") {
        await i.reply({
          content:
            "✏️ Para editar seu perfil:\n\n" +
            "• Faça o quiz de perfil: \`/publicar-quiz-perfil\` (se disponível)\n" +
            "• Ou acesse o painel administrativo no navegador\n" +
            "• Entre em contato com um administrador para configurações avançadas",
          flags: MessageFlags.Ephemeral,
        });
      }
    });

    collector.on("end", async () => {
      try {
        const refreshRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("perfil_refresh")
            .setLabel("Atualizar")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("🔄"),
          new ButtonBuilder()
            .setCustomId("perfil_rank")
            .setLabel("Ver Rank")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🏅"),
        );
        await interaction.editReply({ components: [refreshRow] });
      } catch {
        // Mensagem já foi deletada
      }
    });
  } catch (error) {
    console.error("Erro no comando perfil:", error);
    await interaction
      .reply({
        content: "❌ Erro ao buscar perfil do usuário.",
        ephemeral: true,
      })
      .catch(() => {});
  }
}
