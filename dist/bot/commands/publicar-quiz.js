import { publishSquadQuiz } from "../handlers/squad-quiz.js";
import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, } from "discord.js";
async function handlePublicarQuiz(interaction) {
    await publishSquadQuiz(interaction);
}
export const publicarQuizCommand = {
    data: new SlashCommandBuilder()
        .setName("publicar-quiz-personalidade")
        .setDescription("Publica o quiz de personalidade")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption((opt) => opt
        .setName("canal")
        .setDescription("Canal de destino (padrão: canal atual)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)),
    handler: {
        name: "publicar-quiz",
        description: "Sistema de quiz de personalidade/squad",
        adminOnly: true,
        cooldown: 30,
        execute: handlePublicarQuiz,
    },
};
