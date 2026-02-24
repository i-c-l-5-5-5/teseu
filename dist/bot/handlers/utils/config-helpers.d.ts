import type { ChannelConfig } from "../../../tipos/index.js";
import { type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
export declare function labelPorCampo(field: string): string;
export declare function mapearCanaisTexto(interaction: ChatInputCommandInteraction): Promise<{
    label: string;
    value: string;
    description: string;
}[]>;
export declare function resumoConfiguracoesEmbed(config: ChannelConfig): EmbedBuilder;
