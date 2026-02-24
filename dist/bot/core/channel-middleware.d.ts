import type { ChatInputCommandInteraction } from "discord.js";
export declare function checkChannelPermission(interaction: ChatInputCommandInteraction, feature: "bot_commands_channels" | "admin_commands_channel" | "rank_channel" | "embeds_channel"): Promise<boolean>;
export declare function checkAdminChannelPermission(interaction: ChatInputCommandInteraction): Promise<boolean>;
export declare function checkGeneralChannelPermission(interaction: ChatInputCommandInteraction): Promise<boolean>;
