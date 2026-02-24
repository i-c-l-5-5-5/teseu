/*
SPDX-License-Identifier: MIT
*/

import { commands } from "@bot/commands/index.js";
import { botRegistry } from "@bot/core/registry.js";
import { events } from "@bot/events/index.js";
import { perfilQuizButtonHandler } from "@bot/handlers/perfil-quiz-componente.js";
import { squadQuizComponentHandler } from "@bot/handlers/squad-quiz-componente.js";
import { Client, GatewayIntentBits, Partials } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// Registrar comandos no registry
for (const cmd of commands) {
  botRegistry.register(cmd);
}

// Registrar componentes no registry
botRegistry.register(perfilQuizButtonHandler);
botRegistry.register(squadQuizComponentHandler);

// Registrar eventos no registry e no client
for (const event of events) {
  botRegistry.register(event);
}
botRegistry.registerEvents(client);

// Expor client globalmente
declare global {
  var barqueiroClient: Client | undefined;
}

globalThis.barqueiroClient = client;

// Login
void (async () => {
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error: unknown) {
    console.error("Falha ao conectar no Discord:", error);
  }
})();
