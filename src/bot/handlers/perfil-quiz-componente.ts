import type { ComponentHandler } from "@barqueiro/types";
import { handlePerfilQuizAnswer } from "@bot/handlers/perfil-quiz.js";
import type {
  ButtonInteraction,
  StringSelectMenuInteraction,
} from "discord.js";

/**
 * Handler para botões do quiz de perfil
 */
export const perfilQuizButtonHandler: ComponentHandler = {
  customId: /^perfil_quiz_/,
  type: "button",
  execute: async (
    interaction: ButtonInteraction | StringSelectMenuInteraction,
  ) => {
    if (interaction.isButton()) {
      await handlePerfilQuizAnswer(interaction);
    }
  },
};
