import { type ButtonInteraction, type ChatInputCommandInteraction, type StringSelectMenuInteraction } from "discord.js";
export declare function publishSquadQuiz(interaction: ChatInputCommandInteraction): Promise<void>;
export declare function handleQuizComponents(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<void>;
