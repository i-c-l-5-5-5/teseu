/*
SPDX-License-Identifier: MIT
*/
import { checkChannelPermission } from "@bot/core/channel-middleware.js";
import { getUserXP } from "@services/ranking.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";

export async function handleRank(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    if (!interaction.guildId)
      return void interaction.reply({
        content: "Use em um servidor.",
        flags: MessageFlags.Ephemeral,
      });

    // Verificar se o canal permite comando de rank
    if (!(await checkChannelPermission(interaction, "rank_channel"))) {
      return;
    }

    await interaction.deferReply();

    const target = interaction.options.getUser("user") ?? interaction.user;
    const xp = await getUserXP(target.id, interaction.guildId);
    const level = Math.floor(Math.sqrt(xp));

    const member = await interaction.guild?.members
      .fetch(target.id)
      .catch(() => null);
    const displayName = member?.displayName ?? target.username;
    const avatar = target.displayAvatarURL({ size: 256 });

    const gerarEmbed = () => {
      const xpParaProximo = (level + 1) ** 2 - xp;
      const progresso = (xp - level ** 2) / ((level + 1) ** 2 - level ** 2);
      const barraProgresso =
        "▰".repeat(Math.floor(progresso * 10)) +
        "▱".repeat(10 - Math.floor(progresso * 10));

      return new EmbedBuilder()
        .setTitle(`🏅 Rank de ${displayName}`)
        .setThumbnail(avatar)
        .setColor("#FFD700")
        .addFields(
          { name: "Nível", value: String(level), inline: true },
          { name: "XP Total", value: String(xp), inline: true },
          {
            name: "XP para Próximo Nível",
            value: String(xpParaProximo),
            inline: true,
          },
          {
            name: "Progresso",
            value: `${barraProgresso} ${Math.floor(progresso * 100)}%`,
            inline: false,
          },
        )
        .setFooter({ text: `Usuário: ${target.tag} • Atualizado` })
        .setTimestamp();
    };

    const botoes = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("rank_refresh")
        .setLabel("Atualizar")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🔄"),
      new ButtonBuilder()
        .setCustomId("rank_perfil")
        .setLabel("Ver Perfil")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("👤"),
      new ButtonBuilder()
        .setCustomId("rank_leaderboard")
        .setLabel("Top 10")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🏆"),
    );

    const response = await interaction.editReply({
      embeds: [gerarEmbed()],
      components: [botoes],
    });

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

      if (i.customId === "rank_refresh") {
        await i.deferUpdate();
        if (!interaction.guildId) return;
        await getUserXP(target.id, interaction.guildId);
        await i.editReply({ embeds: [gerarEmbed()], components: [botoes] });
      } else if (i.customId === "rank_perfil") {
        await i.reply({
          content: `Use \`/perfil usuario:@${target.username}\` para ver o perfil completo!`,
          flags: MessageFlags.Ephemeral,
        });
      } else if (i.customId === "rank_leaderboard") {
        await i.reply({
          content:
            "🏆 Top 10 em desenvolvimento! Em breve você verá o ranking completo do servidor.",
          flags: MessageFlags.Ephemeral,
        });
      }
    });

    collector.on("end", async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch {
        // Mensagem já foi deletada
      }
    });
  } catch (error) {
    console.error("Erro no comando rank:", error);
    await (interaction.deferred
      ? interaction.editReply("❌ Erro ao buscar informações de rank.")
      : interaction
          .reply({
            content: "❌ Erro ao buscar informações de rank.",
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {}));
  }
}
