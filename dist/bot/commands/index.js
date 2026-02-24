import { adminCommand } from "../commands/admin.js";
import { configCommand } from "../commands/config.js";
import { debugCommand } from "../commands/debug.js";
import { embedCommand } from "../commands/embed.js";
import { perfilCommand } from "../commands/perfil.js";
import { pingCommand } from "../commands/ping.js";
import { publicarQuizPerfilCommand } from "../commands/publicar-quiz-perfil.js";
import { publicarQuizCommand } from "../commands/publicar-quiz.js";
import { rankCommand } from "../commands/rank.js";
import { serverIdCommand } from "../commands/server-id.js";
export const commands = [
    adminCommand,
    pingCommand,
    rankCommand,
    embedCommand,
    perfilCommand,
    publicarQuizCommand,
    publicarQuizPerfilCommand,
    serverIdCommand,
    debugCommand,
    configCommand,
];
export function getCommandsJSON() {
    return commands.map((cmd) => cmd.data.toJSON());
}
export function getCommand(name) {
    return commands.find((cmd) => cmd.data.name === name);
}
export function getCommandNames() {
    return commands.map((cmd) => cmd.data.name);
}
