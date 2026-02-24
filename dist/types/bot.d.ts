import type { ButtonInteraction, ChatInputCommandInteraction, Client, Message, SlashCommandBuilder, StringSelectMenuInteraction } from "discord.js";
export interface CommandHandler {
    name: string;
    description: string;
    adminOnly?: boolean;
    cooldown?: number;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
export interface SlashCommand {
    data: SlashCommandBuilder;
    handler: CommandHandler;
}
export interface EventHandler<TArgs extends unknown[] = unknown[]> {
    name: string;
    once?: boolean;
    execute: (client: Client, ...args: TArgs) => Promise<void> | void;
}
export interface ComponentHandler {
    customId: string | RegExp;
    type: "button" | "selectMenu";
    execute: (interaction: ButtonInteraction | StringSelectMenuInteraction) => Promise<void>;
}
export interface MessageHandler {
    name: string;
    condition: (message: Message) => boolean;
    execute: (message: Message) => Promise<void> | void;
}
export interface CooldownConfig {
    userId: string;
    commandName: string;
    expiresAt: number;
}
export interface CommandResult {
    success: boolean;
    error?: string;
    data?: unknown;
}
export interface CommandContext {
    interaction: ChatInputCommandInteraction;
    guildId: string | null;
    userId: string;
    isAdmin: boolean;
}
export interface PermissionCheck {
    adminOnly: boolean;
    guildOnly: boolean;
    requiredPermissions?: bigint[];
}
export interface CommandRegistry {
    commands: Map<string, CommandHandler>;
    components: Map<string, ComponentHandler>;
    events: Map<string, EventHandler>;
    register: (item: SlashCommand | ComponentHandler | EventHandler) => void;
    unregister: (name: string, type: "command" | "component" | "event") => void;
}
