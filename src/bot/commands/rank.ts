/*
SPDX-License-Identifier: MIT
*/

import type { SlashCommand } from "@barqueiro/types";
import { handleRank } from "@bot/handlers/rank.js";
import { SlashCommandBuilder } from "discord.js";

/**
 * Comando rank - mostra nível e XP do usuário
 */
export const rankCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Mostra seu nível e XP ou de outro usuário")
    .setDefaultMemberPermissions(null)
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("Usuário para consultar (opcional)")
        .setRequired(false),
    ) as SlashCommandBuilder,

  handler: {
    name: "rank",
    description: "Sistema de XP e níveis por mensagens",
    cooldown: 10, // 10 segundos entre usos
    execute: handleRank,
  },
};
