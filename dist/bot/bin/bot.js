import { commands } from "../commands/index.js";
import { botRegistry } from "../core/registry.js";
import { events } from "../events/index.js";
import { perfilQuizButtonHandler } from "../handlers/perfil-quiz-componente.js";
import { squadQuizComponentHandler } from "../handlers/squad-quiz-componente.js";
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
for (const cmd of commands) {
    botRegistry.register(cmd);
}
botRegistry.register(perfilQuizButtonHandler);
botRegistry.register(squadQuizComponentHandler);
for (const event of events) {
    botRegistry.register(event);
}
botRegistry.registerEvents(client);
globalThis.barqueiroClient = client;
void (async () => {
    try {
        await client.login(process.env.DISCORD_TOKEN);
    }
    catch (error) {
        console.error("Falha ao conectar no Discord:", error);
    }
})();
