import { handlePing } from "../handlers/ping.js";
import { SlashCommandBuilder } from "discord.js";
export const pingCommand = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Responde com Pong!")
        .setDefaultMemberPermissions(null),
    handler: {
        name: "ping",
        description: "Teste de conectividade do bot",
        cooldown: 5,
        execute: handlePing,
    },
};
