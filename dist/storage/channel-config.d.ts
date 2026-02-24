import { type ChannelConfig } from "../tipos/index.js";
export declare function getChannelConfig(guildId: string): Promise<ChannelConfig>;
export declare function setChannelConfig(config: ChannelConfig): Promise<boolean>;
export declare function isChannelAllowed(guildId: string, channelId: string, feature: keyof ChannelConfig): Promise<boolean>;
export declare function getConfiguredChannel(guildId: string, feature: keyof ChannelConfig): Promise<string | null>;
export declare function removeChannelConfig(guildId: string, feature: keyof ChannelConfig): Promise<boolean>;
