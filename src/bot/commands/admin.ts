/*
SPDX-License-Identifier: MIT
*/

import type { SlashCommand } from "@barqueiro/types";
import { handleAdmin } from "@bot/handlers/admin.js";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

/**
 * Comando admin - painel centralizado de administração do bot
 * Oferece uma experiência "clique-clique" para todas as configurações
 */
export const adminCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("⚙️ Painel de Administração - Configure o bot com cliques")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  handler: {
    name: "admin",
    description: "Painel centralizado de administração com menu interativo",
    adminOnly: true,
    cooldown: 5,
    execute: handleAdmin,
  },
};
