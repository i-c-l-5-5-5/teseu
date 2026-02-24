import { handleAdmin } from "../handlers/admin.js";
import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
export const adminCommand = {
    data: new SlashCommandBuilder()
        .setName("admin")
        .setDescription("⚙️ Painel de Administração - Configure o bot com cliques")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    handler: {
        name: "admin",
        description: "Painel centralizado de administração com menu interativo",
        adminOnly: true,
        cooldown: 5,
        execute: handleAdmin,
    },
};
