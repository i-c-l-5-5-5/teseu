/*
SPDX-License-Identifier: MIT
*/

import type { SlashCommand } from "@barqueiro/types";
import { handlePing } from "@bot/handlers/ping.js";
import { SlashCommandBuilder } from "discord.js";

/**
 * Comando ping - resposta simples para testar conectividade
 */
export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Responde com Pong!")
    .setDefaultMemberPermissions(null),

  handler: {
    name: "ping",
    description: "Teste de conectividade do bot",
    cooldown: 5, // 5 segundos entre usos
    execute: handlePing,
  },
};
