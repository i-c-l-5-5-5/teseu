import { handlePerfilQuizAnswer } from "../handlers/perfil-quiz.js";
export const perfilQuizButtonHandler = {
    customId: /^perfil_quiz_/,
    type: "button",
    execute: async (interaction) => {
        if (interaction.isButton()) {
            await handlePerfilQuizAnswer(interaction);
        }
    },
};
