/*
SPDX-License-Identifier: MIT
*/
import "dotenv/config";

import type { Server as HttpServer } from "node:http";

import type { Client as DiscordClient } from "discord.js";

// Entry point unificado: sobe o bot (Discord) e o servidor HTTP (Express)
// - O bot inicializa ao importar @/bot/bin/bot.js (faz login e registra comandos)
// - O servidor inicializa ao importar @/server/server.js (sobe o Express e rotas)

async function main() {
  const envMissing: string[] = [];
  if (!process.env.DISCORD_TOKEN) envMissing.push("DISCORD_TOKEN");
  if (!process.env.DISCORD_CLIENT_ID) envMissing.push("DISCORD_CLIENT_ID");
  if (envMissing.length > 0) {
    console.warn(
      `Aviso: variáveis ausentes: ${envMissing.join(", ")}. O bot pode não conectar corretamente.`,
    );
  }

  // Importa módulos lado a lado; cada um cuida de iniciar seus próprios serviços
  const [_, serverMod] = await Promise.all([
    import("../bot/bin/bot.js"),
    import("../server/server.js"),
  ]);

  // Guardar referências para encerramento gracioso
  try {
    (
      globalThis as unknown as { barqueiroHttpServer?: HttpServer }
    ).barqueiroHttpServer = (serverMod as { server?: HttpServer }).server;
    (
      globalThis as unknown as { barqueiroStopKeepAlive?: () => void }
    ).barqueiroStopKeepAlive = (
      serverMod as { stopKeepAlive?: () => void }
    ).stopKeepAlive;
  } catch {}

  if (process.env.NODE_ENV !== "production")
    console.log(
      "Barqueiro iniciado (bot + servidor). Pressione Ctrl+C para encerrar.",
    );
}

// Tratamento de erros não capturados
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

// Encerramento gracioso
async function shutdown(signal: NodeJS.Signals) {
  if (process.env.NODE_ENV !== "production")
    console.log(`Recebido ${signal}. Encerrando...`);
  try {
    // Parar keep-alive se ativo
    const stopper = (
      globalThis as unknown as { barqueiroStopKeepAlive?: () => void }
    ).barqueiroStopKeepAlive;
    if (typeof stopper === "function") {
      stopper();
    }

    const client = (
      globalThis as unknown as { barqueiroClient?: DiscordClient }
    ).barqueiroClient;
    if (client) {
      await client.destroy();
      if (process.env.NODE_ENV !== "production")
        console.log("Cliente Discord finalizado.");
    }

    // Fechar servidor HTTP
    const httpServer = (
      globalThis as unknown as { barqueiroHttpServer?: HttpServer }
    ).barqueiroHttpServer;
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      if (process.env.NODE_ENV !== "production")
        console.log("Servidor HTTP finalizado.");
    }

    // Fechar DB
    try {
      const { closeDB } = await import("@storage/db-connector.js");
      await closeDB();
      if (process.env.NODE_ENV !== "production")
        console.log("Conexão com DB fechada.");
    } catch {}
  } catch (error) {
    console.error("Falha ao finalizar o cliente Discord:", error);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

// Executa
void main();
