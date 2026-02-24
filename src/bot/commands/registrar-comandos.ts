/*
SPDX-License-Identifier: MIT
*/
import "dotenv/config";

import { getCommandsJSON } from "@bot/commands/index.js";
import { REST, Routes } from "discord.js";

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;
  const clean = process.argv.includes("--clean");

  if (!token || !clientId) {
    const msg =
      "❌ Faltam variáveis: defina DISCORD_TOKEN e DISCORD_CLIENT_ID (opcional: DISCORD_GUILD_ID).";
    console.error(msg);
    throw new Error(msg);
  }

  const rest = new REST({ version: "10" }).setToken(token);
  const body = clean ? [] : getCommandsJSON();

  if (clean) {
    console.log("🗑️ Limpando comandos...");
  } else {
    console.log(`📝 Registrando ${body.length} comandos...`);
    console.log(`Comandos: ${body.map((c) => c.name).join(", ")}`);
  }

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body,
      });
      console.log(
        `✅ Comandos ${clean ? "limpos" : "registrados"} no servidor ${guildId}`,
      );
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body });
      console.log(
        `✅ Comandos ${clean ? "limpos" : "registrados"} globalmente`,
      );
    }
  } catch (error) {
    console.error("❌ Erro ao registrar comandos:", error);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  throw error;
});
