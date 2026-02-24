/*
SPDX-License-Identifier: MIT
*/
import { type ChannelConfig, defaultChannelConfig } from "@barqueiro/types";

import { getDB } from "./db-connector.js";

function isChannelConfig(data: unknown): data is ChannelConfig {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as ChannelConfig).guild_id === "string"
  );
}

/**
 * Obtém a configuração de canais de um servidor
 */
export async function getChannelConfig(
  guildId: string,
): Promise<ChannelConfig> {
  try {
    const db = getDB();
    if (!db) {
      console.error("[DB] Banco de dados não disponível");
      return defaultChannelConfig(guildId);
    }
    const row = (await db.get(
      "SELECT * FROM channel_config WHERE guild_id = $1",
      [guildId],
    )) as
      | {
          guild_id: string;
          embeds_channel?: string;
          xp_channels?: string;
          xp_ignore_channels?: string;
          perfil_quiz_channel?: string;
          squad_quiz_channel?: string;
          admin_commands_channel?: string;
          bot_commands_channels?: string;
          level_up_channel?: string;
          rank_channel?: string;
          restrict_commands?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      | undefined;

    if (!row) return defaultChannelConfig(guildId);

    const config: ChannelConfig = {
      guild_id: row.guild_id,
      embeds_channel: row.embeds_channel || undefined,
      xp_channels: row.xp_channels
        ? (JSON.parse(row.xp_channels) as string[])
        : [],
      xp_ignore_channels: row.xp_ignore_channels
        ? (JSON.parse(row.xp_ignore_channels) as string[])
        : [],
      perfil_quiz_channel: row.perfil_quiz_channel || undefined,
      squad_quiz_channel: row.squad_quiz_channel || undefined,
      admin_commands_channel: row.admin_commands_channel || undefined,
      bot_commands_channels: row.bot_commands_channels
        ? (JSON.parse(row.bot_commands_channels) as string[])
        : [],
      level_up_channel: row.level_up_channel || undefined,
      rank_channel: row.rank_channel || undefined,
      restrict_commands: Boolean(row.restrict_commands),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return isChannelConfig(config) ? config : defaultChannelConfig(guildId);
  } catch (error) {
    console.warn(
      `[DB] Erro ao buscar configuração de canais para guild ${guildId}:`,
      error instanceof Error ? error.message : String(error),
    );
    return defaultChannelConfig(guildId);
  }
}

/**
 * Salva a configuração de canais de um servidor
 */
export async function setChannelConfig(
  config: ChannelConfig,
): Promise<boolean> {
  try {
    const db = getDB();
    if (!db) {
      console.error("[DB] Banco de dados não disponível");
      return false;
    }
    const sql = `
      INSERT INTO channel_config 
      (guild_id, embeds_channel, xp_channels, xp_ignore_channels, 
       perfil_quiz_channel, squad_quiz_channel, admin_commands_channel, 
       bot_commands_channels, level_up_channel, rank_channel, 
       restrict_commands, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      ON CONFLICT (guild_id) DO UPDATE SET
        embeds_channel = EXCLUDED.embeds_channel,
        xp_channels = EXCLUDED.xp_channels,
        xp_ignore_channels = EXCLUDED.xp_ignore_channels,
        perfil_quiz_channel = EXCLUDED.perfil_quiz_channel,
        squad_quiz_channel = EXCLUDED.squad_quiz_channel,
        admin_commands_channel = EXCLUDED.admin_commands_channel,
        bot_commands_channels = EXCLUDED.bot_commands_channels,
        level_up_channel = EXCLUDED.level_up_channel,
        rank_channel = EXCLUDED.rank_channel,
        restrict_commands = EXCLUDED.restrict_commands,
        updated_at = CURRENT_TIMESTAMP
    `;

    await db.run(sql, [
      config.guild_id,
      config.embeds_channel || null,
      config.xp_channels?.length ? JSON.stringify(config.xp_channels) : null,
      config.xp_ignore_channels?.length
        ? JSON.stringify(config.xp_ignore_channels)
        : null,
      config.perfil_quiz_channel || null,
      config.squad_quiz_channel || null,
      config.admin_commands_channel || null,
      config.bot_commands_channels?.length
        ? JSON.stringify(config.bot_commands_channels)
        : null,
      config.level_up_channel || null,
      config.rank_channel || null,
      config.restrict_commands ? 1 : 0,
    ]);

    console.log(
      `[DB] Configuração de canais salva para guild ${config.guild_id}`,
    );
    return true;
  } catch (error) {
    console.error(
      `[DB] Erro ao salvar configuração de canais para guild ${config.guild_id}:`,
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Verifica se um canal está configurado para determinada funcionalidade
 */
export async function isChannelAllowed(
  guildId: string,
  channelId: string,
  feature: keyof ChannelConfig,
): Promise<boolean> {
  const config = await getChannelConfig(guildId);

  switch (feature) {
    case "embeds_channel":
      return !config.embeds_channel || config.embeds_channel === channelId;

    case "xp_channels":
      if (config.xp_ignore_channels?.includes(channelId)) return false;
      return (
        !config.xp_channels?.length || config.xp_channels.includes(channelId)
      );

    case "perfil_quiz_channel":
      return (
        !config.perfil_quiz_channel || config.perfil_quiz_channel === channelId
      );

    case "squad_quiz_channel":
      return (
        !config.squad_quiz_channel || config.squad_quiz_channel === channelId
      );

    case "admin_commands_channel":
      return (
        !config.admin_commands_channel ||
        config.admin_commands_channel === channelId
      );

    case "bot_commands_channels":
      if (!config.restrict_commands) return true;
      return (
        !config.bot_commands_channels?.length ||
        config.bot_commands_channels.includes(channelId)
      );

    case "level_up_channel":
      return !config.level_up_channel || config.level_up_channel === channelId;

    case "rank_channel":
      return !config.rank_channel || config.rank_channel === channelId;

    default:
      return true;
  }
}

/**
 * Obtém o canal configurado para uma funcionalidade
 */
export async function getConfiguredChannel(
  guildId: string,
  feature: keyof ChannelConfig,
): Promise<string | null> {
  const config = await getChannelConfig(guildId);

  switch (feature) {
    case "embeds_channel":
      return config.embeds_channel || null;
    case "perfil_quiz_channel":
      return config.perfil_quiz_channel || null;
    case "squad_quiz_channel":
      return config.squad_quiz_channel || null;
    case "admin_commands_channel":
      return config.admin_commands_channel || null;
    case "level_up_channel":
      return config.level_up_channel || null;
    case "rank_channel":
      return config.rank_channel || null;
    default:
      return null;
  }
}

/**
 * Remove uma configuração específica de canal
 */
export async function removeChannelConfig(
  guildId: string,
  feature: keyof ChannelConfig,
): Promise<boolean> {
  try {
    const config = await getChannelConfig(guildId);

    switch (feature) {
      case "embeds_channel":
        config.embeds_channel = undefined;
        break;
      case "perfil_quiz_channel":
        config.perfil_quiz_channel = undefined;
        break;
      case "squad_quiz_channel":
        config.squad_quiz_channel = undefined;
        break;
      case "admin_commands_channel":
        config.admin_commands_channel = undefined;
        break;
      case "level_up_channel":
        config.level_up_channel = undefined;
        break;
      case "rank_channel":
        config.rank_channel = undefined;
        break;
      case "xp_channels":
        config.xp_channels = [];
        break;
      case "xp_ignore_channels":
        config.xp_ignore_channels = [];
        break;
      case "bot_commands_channels":
        config.bot_commands_channels = [];
        break;
    }

    return await setChannelConfig(config);
  } catch (error) {
    console.error("[DB] Erro ao remover configuração de canal:", error);
    return false;
  }
}
