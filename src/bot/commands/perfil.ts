import type { SlashCommand } from "@barqueiro/types";
import { handlePerfil } from "@bot/handlers/perfil.js";
import { SlashCommandBuilder } from "discord.js";

/**
 * Comando perfil - exibe o perfil público de um usuário do servidor
 */

export const perfilCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("perfil")
    .setDescription("Exibe o perfil público de um usuário do servidor")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("Usuário para consultar o perfil")
        .setRequired(false),
    ) as SlashCommandBuilder,

  handler: {
    name: "perfil",
    description: "Exibe o perfil público de um usuário do servidor",
    cooldown: 5, // 5 segundos entre usos
    execute: handlePerfil,
  },
};
