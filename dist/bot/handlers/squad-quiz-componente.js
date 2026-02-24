import { handleQuizComponents } from "../handlers/squad-quiz.js";
export const squadQuizComponentHandler = {
    customId: /^quiz:/,
    type: "button",
    async execute(interaction) {
        await handleQuizComponents(interaction);
    },
};
