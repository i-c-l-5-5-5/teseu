import "dotenv/config";
async function main() {
    const envMissing = [];
    if (!process.env.DISCORD_TOKEN)
        envMissing.push("DISCORD_TOKEN");
    if (!process.env.DISCORD_CLIENT_ID)
        envMissing.push("DISCORD_CLIENT_ID");
    if (envMissing.length > 0) {
        console.warn(`Aviso: variáveis ausentes: ${envMissing.join(", ")}. O bot pode não conectar corretamente.`);
    }
    const [_, serverMod] = await Promise.all([
        import("../bot/bin/bot.js"),
        import("../server/server.js"),
    ]);
    try {
        globalThis.barqueiroHttpServer = serverMod.server;
        globalThis.barqueiroStopKeepAlive = serverMod.stopKeepAlive;
    }
    catch { }
    if (process.env.NODE_ENV !== "production")
        console.log("Barqueiro iniciado (bot + servidor). Pressione Ctrl+C para encerrar.");
}
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});
async function shutdown(signal) {
    if (process.env.NODE_ENV !== "production")
        console.log(`Recebido ${signal}. Encerrando...`);
    try {
        const stopper = globalThis.barqueiroStopKeepAlive;
        if (typeof stopper === "function") {
            stopper();
        }
        const client = globalThis.barqueiroClient;
        if (client) {
            await client.destroy();
            if (process.env.NODE_ENV !== "production")
                console.log("Cliente Discord finalizado.");
        }
        const httpServer = globalThis.barqueiroHttpServer;
        if (httpServer) {
            await new Promise((resolve) => httpServer.close(() => resolve()));
            if (process.env.NODE_ENV !== "production")
                console.log("Servidor HTTP finalizado.");
        }
        try {
            const { closeDB } = await import("../storage/db-connector.js");
            await closeDB();
            if (process.env.NODE_ENV !== "production")
                console.log("Conexão com DB fechada.");
        }
        catch { }
    }
    catch (error) {
        console.error("Falha ao finalizar o cliente Discord:", error);
    }
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
void main();
