/*
SPDX-License-Identifier: MIT
*/
import type { EventHandler } from "@barqueiro/types";
import type { Client } from "discord.js";
import { Events } from "discord.js";

/**
 * Evento ready - quando o bot fica online
 */
export const readyEvent: EventHandler = {
  name: Events.ClientReady,
  once: true,

  execute: async (client: Client) => {
    if (process.env.NODE_ENV !== "production")
      console.log(`Bot online como ${client.user?.tag}`);

    // Expor client globalmente para uso do servidor
    globalThis.barqueiroClient = client;

    // Registrar comandos automaticamente
    await registerSlashCommands(client);
  },
};

/**
 * Função para registrar comandos slash
 */
async function registerSlashCommands(_client: Client) {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    console.warn(
      "DISCORD_TOKEN ou DISCORD_CLIENT_ID ausentes; pulando registro de comandos.",
    );
    return;
  }

  try {
    const { REST, Routes } = await import("discord.js");
    const { getCommandsJSON } = await import("@bot/commands/index.js");

    const rest = new REST({ version: "10" }).setToken(token);
    const commands = getCommandsJSON();

    const guildId = process.env.DISCORD_GUILD_ID;

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      if (process.env.NODE_ENV !== "production")
        console.log(`Comandos registrados no servidor ${guildId}.`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
      if (process.env.NODE_ENV !== "production")
        console.log("Comandos registrados (globais).");
    }
  } catch (error: unknown) {
    console.error("Falha ao registrar comandos:", error);
  }
}
