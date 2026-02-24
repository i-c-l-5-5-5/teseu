import type { SlashCommand } from "../../tipos/index.js";
export declare const commands: SlashCommand[];
export declare function getCommandsJSON(): import("discord.js").RESTPostAPIChatInputApplicationCommandsJSONBody[];
export declare function getCommand(name: string): SlashCommand | undefined;
export declare function getCommandNames(): string[];
