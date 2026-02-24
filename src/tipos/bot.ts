/*
SPDX-License-Identifier: MIT
*/
import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  Message,
  SlashCommandBuilder,
  StringSelectMenuInteraction,
} from "discord.js";

/**
 * Interface padrão para handlers de comandos slash
 */
export interface CommandHandler {
  name: string;
  description: string;
  adminOnly?: boolean;
  cooldown?: number; // em segundos
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/**
 * Interface para comandos slash com builder
 */
export interface SlashCommand {
  data: SlashCommandBuilder;
  handler: CommandHandler;
}

/**
 * Interface para handlers de eventos Discord
 */
export interface EventHandler<TArgs extends unknown[] = unknown[]> {
  name: string;
  once?: boolean;
  execute: (client: Client, ...args: TArgs) => Promise<void> | void;
}

/**
 * Interface para handlers de componentes (botões, select menus)
 */
export interface ComponentHandler {
  customId: string | RegExp;
  type: "button" | "selectMenu";
  execute: (
    interaction: ButtonInteraction | StringSelectMenuInteraction,
  ) => Promise<void>;
}

/**
 * Interface para handlers de mensagens
 */
export interface MessageHandler {
  name: string;
  condition: (message: Message) => boolean;
  execute: (message: Message) => Promise<void> | void;
}

/**
 * Interface para configuração de cooldown
 */
export interface CooldownConfig {
  userId: string;
  commandName: string;
  expiresAt: number;
}

/**
 * Interface para resultado de comando
 */
export interface CommandResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Interface para contexto de execução de comando
 */
export interface CommandContext {
  interaction: ChatInputCommandInteraction;
  guildId: string | null;
  userId: string;
  isAdmin: boolean;
}

/**
 * Interface para validação de permissões
 */
export interface PermissionCheck {
  adminOnly: boolean;
  guildOnly: boolean;
  requiredPermissions?: bigint[];
}

/**
 * Interface para registro de comandos
 */
export interface CommandRegistry {
  commands: Map<string, CommandHandler>;
  components: Map<string, ComponentHandler>;
  events: Map<string, EventHandler>;
  register: (item: SlashCommand | ComponentHandler | EventHandler) => void;
  unregister: (name: string, type: "command" | "component" | "event") => void;
}
