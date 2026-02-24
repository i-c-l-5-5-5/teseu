/*
SPDX-License-Identifier: MIT
*/

import { getChannelConfig, setChannelConfig } from "@storage/channel-config.js";
import type {
  ChannelSelectMenuInteraction,
  StringSelectMenuInteraction,
} from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";

import { resumoConfiguracoesEmbed } from "./utils/config-helpers.js";

/**
 * Handler para quando o admin seleciona uma funcionalidade para configurar
 */
export async function handleAdminSelectFuncionalidade(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const funcionalidade = interaction.values[0];
  if (!funcionalidade) {
    await interaction.reply({
      content: "❌ Funcionalidade não selecionada.",
      ephemeral: true,
    });
    return;
  }

  // Casos especiais que não precisam de seleção de canal
  if (funcionalidade === "xp_config") {
    await mostrarConfigXP(interaction);
    return;
  }

  if (funcionalidade === "listar_config") {
    await mostrarListarConfig(interaction);
    return;
  }

  // Para as demais funcionalidades, mostrar seletor de canal
  const embed = new EmbedBuilder()
    .setTitle(`🔧 Configurar ${getFuncionalidadeNome(funcionalidade)}`)
    .setDescription(
      `Selecione o canal que deseja usar para **${getFuncionalidadeNome(funcionalidade)}**.\n\n` +
        "O canal selecionado será salvo automaticamente.",
    )
    .setColor("#5865F2");

  const channelSelector =
    new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId(`admin_channel_${funcionalidade}`)
        .setPlaceholder("Selecione um canal...")
        .setChannelTypes(ChannelType.GuildText),
    );

  const botaoVoltar = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("admin_voltar_canais")
      .setLabel("⬅️ Voltar")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({
    embeds: [embed],
    components: [channelSelector, botaoVoltar],
  });
}

/**
 * Handler para quando o admin seleciona um canal
 */
export async function handleAdminChannelSelection(
  interaction: ChannelSelectMenuInteraction,
): Promise<void> {
  const funcionalidade = interaction.customId.replace("admin_channel_", "");
  const channelId = interaction.values[0];
  const { guildId } = interaction;
  if (!guildId) {
    await interaction.reply({
      content: "❌ Esta ação só pode ser usada em servidores.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const config = await getChannelConfig(guildId);
  const updated = { ...config, [funcionalidade]: channelId } as typeof config;
  await setChannelConfig(updated);

  // Mostrar confirmação
  const embed = new EmbedBuilder()
    .setTitle("✅ Canal Configurado!")
    .setDescription(
      `**${getFuncionalidadeNome(funcionalidade)}** foi configurado para <#${channelId}>\n\n` +
        "Você pode:\n" +
        "• Configurar outro canal\n" +
        "• Ver todas as configurações\n" +
        "• Voltar ao menu principal",
    )
    .setColor("#00FF00");

  const botoes = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("admin_voltar_canais")
      .setLabel("Configurar Outro")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔧"),
    new ButtonBuilder()
      .setCustomId("admin_ver_status")
      .setLabel("Ver Status")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📊"),
    new ButtonBuilder()
      .setCustomId("admin_voltar_principal")
      .setLabel("Menu Principal")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⬅️"),
  );

  await interaction.update({
    embeds: [embed],
    components: [botoes],
  });
}

/**
 * Mostra o menu de configuração de XP
 */
async function mostrarConfigXP(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const { guildId } = interaction;
  if (!guildId) {
    await interaction.reply({
      content: "❌ Este painel só funciona em servidores.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const config = await getChannelConfig(guildId);

  const embed = new EmbedBuilder()
    .setTitle("💎 Configuração de XP")
    .setDescription(
      "**Configure quais canais permitem ganho de XP!**\n\n" +
        "Você pode:\n" +
        "✅ **Adicionar canais permitidos** - Apenas esses ganham XP\n" +
        "❌ **Adicionar canais ignorados** - Esses nunca ganham XP\n" +
        "📋 **Ver configuração atual**\n\n" +
        `**Status atual:**\n` +
        `Canais permitidos: ${config.xp_channels?.length || 0}\n` +
        `Canais ignorados: ${config.xp_ignore_channels?.length || 0}`,
    )
    .setColor("#5865F2")
    .setFooter({ text: "Use /config xp para configurar em detalhes" });

  const botaoVoltar = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("admin_voltar_canais")
      .setLabel("⬅️ Voltar")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({
    embeds: [embed],
    components: [botaoVoltar],
  });
}

/**
 * Lista todas as configurações
 */
async function mostrarListarConfig(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const { guildId } = interaction;
  if (!guildId) {
    await interaction.reply({
      content: "❌ Este painel só funciona em servidores.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const config = await getChannelConfig(guildId);

  const embed = resumoConfiguracoesEmbed(config).setTitle(
    "📋 Todas as Configurações",
  );

  const botaoVoltar = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("admin_voltar_canais")
      .setLabel("⬅️ Voltar")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({
    embeds: [embed],
    components: [botaoVoltar],
  });
}

/**
 * Retorna o nome legível da funcionalidade
 */
function getFuncionalidadeNome(funcionalidade: string): string {
  const nomes: { [key: string]: string } = {
    embeds_channel: "Embeds/Anúncios",
    perfil_quiz_channel: "Quiz de Perfil",
    squad_quiz_channel: "Quiz de Squads",
    rank_channel: "Ranking",
    level_up_channel: "Level Up",
    admin_commands_channel: "Comandos Admin",
    xp_config: "Configuração de XP",
    listar_config: "Listar Configurações",
  };
  return nomes[funcionalidade] || funcionalidade;
}
