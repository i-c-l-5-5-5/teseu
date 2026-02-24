/*
SPDX-License-Identifier: MIT
*/

// Importar todos os comandos
import type { SlashCommand } from "@barqueiro/types";
import { adminCommand } from "@bot/commands/admin.js";
import { configCommand } from "@bot/commands/config.js";
import { debugCommand } from "@bot/commands/debug.js";
import { embedCommand } from "@bot/commands/embed.js";
import { perfilCommand } from "@bot/commands/perfil.js";
import { pingCommand } from "@bot/commands/ping.js";
import { publicarQuizPerfilCommand } from "@bot/commands/publicar-quiz-perfil.js";
import { publicarQuizCommand } from "@bot/commands/publicar-quiz.js";
import { rankCommand } from "@bot/commands/rank.js";
import { serverIdCommand } from "@bot/commands/server-id.js";

/**
 * Registry de todos os comandos disponíveis
 */
export const commands: SlashCommand[] = [
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

/**
 * Função para obter JSON dos comandos (compatibilidade com código existente)
 */
export function getCommandsJSON() {
  return commands.map((cmd) => cmd.data.toJSON());
}

/**
 * Função para obter comando por nome
 */
export function getCommand(name: string): SlashCommand | undefined {
  return commands.find((cmd) => cmd.data.name === name);
}

/**
 * Função para listar todos os nomes de comandos
 */
export function getCommandNames(): string[] {
  return commands.map((cmd) => cmd.data.name);
}
