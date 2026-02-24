/*
SPDX-License-Identifier: MIT
*/

import type { SlashCommand } from "@barqueiro/types";
import { handleDebug } from "@bot/handlers/debug.js";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

/**
 * Comando debug - informações do sistema (apenas admins)
 */
export const debugCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("debug")
    .setDescription("Informações de debug do bot (apenas admins)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("Informações do sistema e banco de dados"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("db-write")
        .setDescription("Testar escrita no banco (persistência)")
        .addStringOption((opt) =>
          opt
            .setName("valor")
            .setDescription("Valor de teste para salvar (opcional)")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("db-read")
        .setDescription("Ler últimos testes de escrita do banco"),
    ) as SlashCommandBuilder,

  handler: {
    name: "debug",
    description: "Sistema de debug e monitoramento",
    adminOnly: true,
    cooldown: 30,
    execute: handleDebug,
  },
};
