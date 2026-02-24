/*
SPDX-License-Identifier: MIT
*/

import type { SlashCommand } from "@barqueiro/types";
import { publishSquadQuiz } from "@bot/handlers/squad-quiz.js";
import type { ChatInputCommandInteraction } from "discord.js";
import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

async function handlePublicarQuiz(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await publishSquadQuiz(interaction);
}

/**
 * Comando publicar-quiz - publica o quiz de personalidade/squad para usuários
 */
export const publicarQuizCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("publicar-quiz-personalidade")
    .setDescription("Publica o quiz de personalidade")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName("canal")
        .setDescription("Canal de destino (padrão: canal atual)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    ) as SlashCommandBuilder,

  handler: {
    name: "publicar-quiz",
    description: "Sistema de quiz de personalidade/squad",
    adminOnly: true,
    cooldown: 30,
    execute: handlePublicarQuiz,
  },
};
