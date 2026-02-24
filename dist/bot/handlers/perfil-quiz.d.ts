import type { ButtonInteraction, Message, User } from "discord.js";
export declare function startPerfilQuiz(message: Message, user: User): Promise<void>;
export declare function handlePerfilQuizAnswer(interaction: ButtonInteraction): Promise<void>;
