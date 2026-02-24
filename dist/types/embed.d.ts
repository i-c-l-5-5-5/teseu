import { EmbedBuilder, type GuildTextBasedChannel } from "discord.js";
export interface EmbedData {
    title?: string;
    description?: string;
    color?: string;
    image?: string;
    thumbnail?: string;
    author?: string;
    authorIcon?: string;
    footer?: string;
    fields: Array<{
        name: string;
        value: string;
        inline: boolean;
    }>;
}
export interface AnnouncementData {
    title: string;
    description: string;
    color?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    footerText?: string;
    authorName?: string;
    authorIconUrl?: string;
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
}
export interface AnnouncementOptions {
    channelId: string;
    guildId: string;
    data: AnnouncementData;
    mention?: {
        type: "everyone" | "here" | "role" | "user";
        target?: string;
    };
}
export declare function createAnnouncementEmbed(data: AnnouncementData): EmbedBuilder;
export declare function createMentionText(mention?: AnnouncementOptions["mention"]): string;
export declare function validateAnnouncementChannel(channelId: string): Promise<{
    valid: boolean;
    channel?: GuildTextBasedChannel;
    error?: string;
}>;
export declare function sendAnnouncement(options: AnnouncementOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
export declare function getAnnouncementChannels(guildId: string): Promise<{
    success: boolean;
    channels?: Array<{
        id: string;
        name: string;
        type: string;
    }>;
    error?: string;
}>;
export declare function createAnnouncementTemplate(type: "welcome" | "event" | "update" | "maintenance"): AnnouncementData;
