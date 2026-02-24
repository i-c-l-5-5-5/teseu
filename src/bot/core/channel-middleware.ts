/*
SPDX-License-Identifier: MIT
*/
import { isChannelAllowed } from "@storage/channel-config.js";
import type { ChatInputCommandInteraction } from "discord.js";

/**
 * Middleware para verificar se um comando pode ser executado no canal atual
 */
export async function checkChannelPermission(
  interaction: ChatInputCommandInteraction,
  feature:
    | "bot_commands_channels"
    | "admin_commands_channel"
    | "rank_channel"
    | "embeds_channel",
): Promise<boolean> {
  if (!interaction.guildId) return true; // DMs sempre permitidas

  const allowed = await isChannelAllowed(
    interaction.guildId,
    interaction.channelId,
    feature,
  );

  if (!allowed) {
    let message = "❌ Este comando não pode ser usado neste canal.";

    // Mensagens específicas por tipo
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

/**
 * Middleware para comandos admin que verifica canal específico
 */
export async function checkAdminChannelPermission(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  return await checkChannelPermission(interaction, "admin_commands_channel");
}

/**
 * Middleware para comandos gerais que verifica restrições
 */
export async function checkGeneralChannelPermission(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  return await checkChannelPermission(interaction, "bot_commands_channels");
}
