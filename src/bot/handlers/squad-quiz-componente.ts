/*
SPDX-License-Identifier: MIT
*/
import type { ComponentHandler } from "@barqueiro/types";
import { handleQuizComponents } from "@bot/handlers/squad-quiz.js";
import type {
  ButtonInteraction,
  StringSelectMenuInteraction,
} from "discord.js";

/**
 * Handler para componentes do quiz de squad/personalidade
 */
export const squadQuizComponentHandler: ComponentHandler = {
  customId: /^quiz:/,
  type: "button" as const,

  async execute(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
  ): Promise<void> {
    await handleQuizComponents(interaction);
  },
};
