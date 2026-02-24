import { handlePerfil } from "../handlers/perfil.js";
import { SlashCommandBuilder } from "discord.js";
export const perfilCommand = {
    data: new SlashCommandBuilder()
        .setName("perfil")
        .setDescription("Exibe o perfil público de um usuário do servidor")
        .addUserOption((option) => option
        .setName("usuario")
        .setDescription("Usuário para consultar o perfil")
        .setRequired(false)),
    handler: {
        name: "perfil",
        description: "Exibe o perfil público de um usuário do servidor",
        cooldown: 5,
        execute: handlePerfil,
    },
};
