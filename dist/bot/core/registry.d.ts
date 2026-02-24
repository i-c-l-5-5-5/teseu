import type { CommandHandler, CommandRegistry, ComponentHandler, EventHandler, SlashCommand } from "../../tipos/index.js";
import type { ButtonInteraction, ChatInputCommandInteraction, Client, StringSelectMenuInteraction } from "discord.js";
declare class BotRegistry implements CommandRegistry {
    commands: Map<string, CommandHandler>;
    components: Map<string, ComponentHandler>;
    events: Map<string, EventHandler<unknown[]>>;
    private readonly cooldowns;
    register(item: SlashCommand | ComponentHandler | EventHandler): void;
    unregister(name: string, type: "command" | "component" | "event"): void;
    executeCommand(commandName: string, interaction: ChatInputCommandInteraction): Promise<void>;
    executeComponent(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<void>;
    registerEvents(client: Client): void;
    private createCommandContext;
    private checkPermissions;
    private checkCooldown;
    private applyCooldown;
    private getRemainingCooldown;
    clearCooldowns(): void;
    getStats(): {
        commands: number;
        components: number;
        events: number;
        activeCooldowns: number;
        commandNames: string[];
        componentIds: string[];
        eventNames: string[];
    };
    hasCommand(name: string): boolean;
    hasComponent(customId: string): boolean;
}
export declare const botRegistry: BotRegistry;
export declare const registerCommand: (command: SlashCommand) => void;
export declare const registerComponent: (component: ComponentHandler) => void;
export declare const registerEvent: (event: EventHandler) => void;
export {};
