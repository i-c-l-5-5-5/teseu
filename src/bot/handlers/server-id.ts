/*
SPDX-License-Identifier: MIT
*/
import {
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";

export async function handleServerId(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    const isAdmin = interaction.memberPermissions?.has(
      PermissionFlagsBits.Administrator,
    );
    if (!isAdmin)
      return void interaction.reply({
        content: "Apenas administradores.",
        flags: MessageFlags.Ephemeral,
      });
    return void interaction.reply({
      content: `Server ID: ${interaction.guildId}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error("Erro no comando server-id:", error);
    await interaction
      .reply({
        content: "❌ Erro ao executar comando.",
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
  }
}
