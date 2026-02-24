/*
SPDX-License-Identifier: MIT
*/

import type { SlashCommand } from "@barqueiro/types";
import { handleServerId } from "@bot/handlers/server-id.js";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

/**
 * Comando server-id - mostra o ID do servidor (admin only)
 */
export const serverIdCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("server-id")
    .setDescription("Mostra o ID deste servidor (apenas para ADM)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  handler: {
    name: "server-id",
    description: "Utilitário para obter ID do servidor",
    adminOnly: true,
    cooldown: 5,
    execute: handleServerId,
  },
};
