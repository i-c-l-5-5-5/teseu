import { handleRank } from "../handlers/rank.js";
import { SlashCommandBuilder } from "discord.js";
export const rankCommand = {
    data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription("Mostra seu nível e XP ou de outro usuário")
        .setDefaultMemberPermissions(null)
        .addUserOption((opt) => opt
        .setName("user")
        .setDescription("Usuário para consultar (opcional)")
        .setRequired(false)),
    handler: {
        name: "rank",
        description: "Sistema de XP e níveis por mensagens",
        cooldown: 10,
        execute: handleRank,
    },
};
