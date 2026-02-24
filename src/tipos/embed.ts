/*
SPDX-License-Identifier: MIT
*/
import {
  ChannelType,
  type ColorResolvable,
  EmbedBuilder,
  type GuildTextBasedChannel,
  type MessageCreateOptions,
} from "discord.js";

import { DISCORD_COLORS } from "./common.js";

/**
 * Interface de dados da embed sendo construída no editor interativo
 */
export interface EmbedData {
  title?: string;
  description?: string;
  color?: string;
  image?: string;
  thumbnail?: string;
  author?: string;
  authorIcon?: string;
  footer?: string;
  fields: Array<{ name: string; value: string; inline: boolean }>;
}

// Tipos para anúncios
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
    target?: string; // role ID ou user ID
  };
}

/**
 * Cria um embed para anúncio baseado nos dados fornecidos
 */
export function createAnnouncementEmbed(data: AnnouncementData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(data.title)
    .setDescription(data.description);

  // Cor do embed
  if (data.color) {
    try {
      embed.setColor(data.color as ColorResolvable);
    } catch {
      embed.setColor(DISCORD_COLORS.BLURPLE);
    }
  } else {
    embed.setColor(DISCORD_COLORS.BLURPLE);
  }

  // Imagem principal
  if (data.imageUrl) {
    try {
      embed.setImage(data.imageUrl);
    } catch {
      console.warn("URL de imagem inválida:", data.imageUrl);
    }
  }

  // Thumbnail
  if (data.thumbnailUrl) {
    try {
      embed.setThumbnail(data.thumbnailUrl);
    } catch {
      console.warn("URL de thumbnail inválida:", data.thumbnailUrl);
    }
  }

  // Footer
  if (data.footerText) {
    embed.setFooter({ text: data.footerText });
  }

  // Autor
  if (data.authorName) {
    embed.setAuthor({
      name: data.authorName,
      iconURL: data.authorIconUrl,
    });
  }

  // Campos adicionais
  if (data.fields && data.fields.length > 0) {
    for (const field of data.fields) {
      embed.addFields({
        name: field.name,
        value: field.value,
        inline: field.inline || false,
      });
    }
  }

  // Timestamp
  embed.setTimestamp();

  return embed;
}

/**
 * Cria o texto de menção baseado nas opções
 */
export function createMentionText(
  mention?: AnnouncementOptions["mention"],
): string {
  if (!mention) return "";

  switch (mention.type) {
    case "everyone":
      return "@everyone";
    case "here":
      return "@here";
    case "role":
      return mention.target ? `<@&${mention.target}>` : "";
    case "user":
      return mention.target ? `<@${mention.target}>` : "";
    default:
      return "";
  }
}

/**
 * Valida se um canal é válido para envio de anúncios
 */
export async function validateAnnouncementChannel(channelId: string): Promise<{
  valid: boolean;
  channel?: GuildTextBasedChannel;
  error?: string;
}> {
  try {
    const client = globalThis.barqueiroClient;
    if (!client) {
      return { valid: false, error: "Bot não conectado" };
    }

    const channel = await client.channels.fetch(channelId);

    if (!channel) {
      return { valid: false, error: "Canal não encontrado" };
    }

    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement
    ) {
      return { valid: false, error: "Canal deve ser de texto ou anúncios" };
    }

    const textChannel = channel as GuildTextBasedChannel;

    // Verifica se o bot tem permissões necessárias
    if (!client.user) {
      return {
        valid: false,
        error: "Bot não autenticado para checar permissões.",
      };
    }
    const permissions = textChannel.permissionsFor(client.user);
    if (!permissions?.has(["SendMessages", "EmbedLinks"])) {
      return {
        valid: false,
        error: "Bot não tem permissões necessárias no canal",
      };
    }

    return { valid: true, channel: textChannel };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { valid: false, error: `Erro ao validar canal: ${msg}` };
  }
}

/**
 * Envia um anúncio para o canal especificado
 */
export async function sendAnnouncement(options: AnnouncementOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Valida o canal
    const validation = await validateAnnouncementChannel(options.channelId);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { channel } = validation;
    if (!channel) {
      return {
        success: false,
        error: "Canal não encontrado para envio do anúncio.",
      };
    }

    // Cria o embed
    const embed = createAnnouncementEmbed(options.data);

    // Cria o texto de menção
    const mentionText = createMentionText(options.mention);

    // Envia a mensagem
    const messageOptions: MessageCreateOptions = {
      embeds: [embed],
      ...(mentionText ? { content: mentionText } : {}),
    };

    const message = await channel.send(messageOptions);

    return { success: true, messageId: message.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Erro ao enviar anúncio:", msg);
    return { success: false, error: `Falha ao enviar anúncio: ${msg}` };
  }
}

/**
 * Lista canais disponíveis para anúncios em um servidor
 */
export async function getAnnouncementChannels(guildId: string): Promise<{
  success: boolean;
  channels?: Array<{ id: string; name: string; type: string }>;
  error?: string;
}> {
  try {
    const client = globalThis.barqueiroClient;
    if (!client) {
      return { success: false, error: "Bot não conectado" };
    }

    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return { success: false, error: "Servidor não encontrado" };
    }

    const channels = Array.from(guild.channels.cache.values())
      .filter(
        (ch) =>
          ch.type === ChannelType.GuildText ||
          ch.type === ChannelType.GuildAnnouncement,
      )
      .filter((ch) => {
        // Verifica se o bot tem permissões
        if (!client.user) return false;
        const permissions = ch.permissionsFor(client.user);
        return permissions?.has(["SendMessages", "EmbedLinks"]) ?? false;
      })
      .map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type === ChannelType.GuildAnnouncement ? "Anúncios" : "Texto",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, channels };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Erro ao buscar canais:", msg);
    return { success: false, error: `Falha ao buscar canais: ${msg}` };
  }
}

/**
 * Cria um anúncio de template para eventos comuns
 */
export function createAnnouncementTemplate(
  type: "welcome" | "event" | "update" | "maintenance",
): AnnouncementData {
  const templates: Record<string, AnnouncementData> = {
    welcome: {
      title: "🎉 Bem-vindos ao Servidor!",
      description: "Sejam bem-vindos! Leiam as regras e divirtam-se!",
      color: "#00ff00",
      footerText: "Equipe de Moderação",
    },
    event: {
      title: "📅 Novo Evento!",
      description: "Não percam nosso próximo evento! Detalhes em breve.",
      color: "#ff6b6b",
      footerText: "Equipe de Eventos",
    },
    update: {
      title: "🔄 Atualização do Servidor",
      description: "Novidades e melhorias foram implementadas!",
      color: "#4dabf7",
      footerText: "Equipe de Desenvolvimento",
    },
    maintenance: {
      title: "🔧 Manutenção Programada",
      description: "O servidor passará por manutenção. Pedimos compreensão.",
      color: "#ffa500",
      footerText: "Equipe Técnica",
    },
  };

  return (templates[type] ?? templates.update) as AnnouncementData;
}
