import { handleServerId } from "../handlers/server-id.js";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
export const serverIdCommand = {
    data: new SlashCommandBuilder()
        .setName("server-id")
        .setDescription("Mostra o ID deste servidor (apenas para ADM)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    handler: {
        name: "server-id",
        description: "Utilitário para obter ID do servidor",
        adminOnly: true,
        cooldown: 5,
        execute: handleServerId,
    },
};
