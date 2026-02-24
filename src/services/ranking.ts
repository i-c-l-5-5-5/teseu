/*
SPDX-License-Identifier: MIT
*/
import type {
  LeaderboardEntry,
  RankConfig,
  RankRoleConfig,
  UserRank,
} from "@barqueiro/types";
import { isChannelAllowed } from "@storage/channel-config.js";

import { getDB } from "@/storage/db-connector.js";

/**
 * XP mínimo ganho por mensagem.
 */
const MIN_XP_GAIN = 10;
/**
 * XP máximo ganho por mensagem.
 */
const MAX_XP_GAIN = 15;
/**
 * XP necessário por nível (limite base).
 */
const XP_PER_LEVEL = 100;
/**
 * Estimativa média de XP por mensagem usada para derivar `message_count` em leaderboard.
 */
const AVERAGE_XP_PER_MESSAGE = 10;

// Cache em memória para rankings (fallback durável entre falhas de leitura)
const memRankConfigs = new Map<string, RankConfig>();
const memUserRanks = new Map<string, UserRank>();

/**
 * Recupera configuração de ranking (enabled + roles) da guild.
 * Fallback para cache em memória se não houver persistência.
 */
export async function getRankConfig(guildId: string): Promise<RankConfig> {
  try {
    const db = getDB();
    const row = (await db.get("SELECT value FROM config WHERE key = $1", [
      `rank_config_${guildId}`,
    ])) as { value: string } | undefined;

    if (row) {
      const config = JSON.parse(row.value) as RankConfig;
      const enabled = Boolean(config.enabled);
      const roles = Array.isArray(config.roles) ? config.roles : [];

      return {
        enabled,
        roles,
      };
    }
  } catch (error) {
    console.error("[DB] Erro ao buscar configuração de ranking:", error);
  }

  // Fallback em memória
  return (
    memRankConfigs.get(guildId) ?? {
      enabled: false,
      roles: [],
    }
  );
}

/**
 * Persiste configuração de ranking e atualiza cache em memória.
 */
export async function setRankConfig(
  guildId: string,
  config: RankConfig,
): Promise<boolean> {
  try {
    const db = getDB();
    const sql = `
      INSERT INTO config 
      (key, value, updated_at) 
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = CURRENT_TIMESTAMP
    `;

    await db.run(sql, [`rank_config_${guildId}`, JSON.stringify(config)]);

    // Atualizar cache em memória
    memRankConfigs.set(guildId, config);
    return true;
  } catch (error) {
    console.error("[DB] Erro ao salvar configuração de ranking:", error);
    return false;
  }
}

/**
 * Adiciona XP por mensagem validando canal permitido.
 * Aplica ganho randômico limitado e calcula nível por divisão inteira.
 * @returns Novo nível, flag de level-up e cargo (se atribuído)
 */
export async function addMessageXP(
  userId: string,
  guildId: string,
  channelId?: string,
): Promise<{
  newLevel: number;
  leveledUp: boolean;
  newRank?: string;
}> {
  try {
    // Verificar se o canal permite XP
    if (
      channelId &&
      !(await isChannelAllowed(guildId, channelId, "xp_channels"))
    ) {
      return {
        newLevel: 1,
        leveledUp: false,
      };
    }

    const db = getDB();

    // Buscar dados atuais do usuário
    const currentData = (await db.get(
      "SELECT * FROM xp WHERE user_id = $1 AND guild_id = $2",
      [userId, guildId],
    )) as
      | {
          xp: number;
          level: number;
        }
      | undefined;

    const currentXP = currentData?.xp ?? 0;
    const currentLevel = currentData?.level ?? 1; // Ganho aleatório entre limites definidos
    const xpGain =
      Math.floor(Math.random() * (MAX_XP_GAIN - MIN_XP_GAIN + 1)) + MIN_XP_GAIN;
    const newXP = currentXP + xpGain;

    // Calcular novo nível (base XP_PER_LEVEL)
    const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
    const leveledUp = newLevel > currentLevel;

    // Atualizar dados
    const sql = `
      INSERT INTO xp 
      (user_id, guild_id, xp, level, last_message_at, updated_at, created_at) 
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 
              COALESCE((SELECT created_at FROM xp WHERE user_id = $1 AND guild_id = $2), CURRENT_TIMESTAMP))
      ON CONFLICT (user_id, guild_id) DO UPDATE SET
        xp = EXCLUDED.xp,
        level = EXCLUDED.level,
        last_message_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `;

    await db.run(sql, [userId, guildId, newXP, newLevel]);

    let newRank: string | undefined;

    // Se subiu de nível, verificar se deve receber novo cargo
    if (leveledUp) {
      const rankData = (await db.get(
        "SELECT role_name FROM rank_roles WHERE guild_id = $1 AND level = $2",
        [guildId, newLevel],
      )) as { role_name: string } | undefined;

      if (rankData !== null && rankData !== undefined) {
        newRank = rankData.role_name;
      }
    }

    return {
      newLevel,
      leveledUp,
      newRank,
    };
  } catch (error) {
    console.error("[DB] Erro ao adicionar XP por mensagem:", error);
    return {
      newLevel: 1,
      leveledUp: false,
    };
  }
}

/**
 * Retorna XP acumulado do usuário na guild.
 */
export async function getUserXP(
  userId: string,
  guildId: string,
): Promise<number> {
  try {
    const db = getDB();
    const row = (await db.get(
      "SELECT xp FROM xp WHERE user_id = $1 AND guild_id = $2",
      [userId, guildId],
    )) as { xp: number } | undefined;
    return row?.xp ?? 0;
  } catch (error) {
    console.error("[DB] Erro ao buscar XP do usuário:", error);
    return 0;
  }
}

/**
 * Retorna dados de ranking de um usuário (inclui posição). Usa cache para fallback.
 */
export async function getUserRank(
  userId: string,
  guildId: string,
): Promise<UserRank> {
  const userKey = `${userId}-${guildId}`;

  try {
    const db = getDB();
    const row = (await db.get(
      "SELECT * FROM xp WHERE user_id = $1 AND guild_id = $2",
      [userId, guildId],
    )) as
      | {
          user_id: string;
          guild_id: string;
          xp: number;
          level: number;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (row) {
      // Calcular posição no ranking
      const positionData = (await db.get(
        `
        SELECT COUNT(*) + 1 as position 
        FROM xp 
        WHERE guild_id = $1 
        AND (xp > $2 OR (xp = $2 AND user_id < $3))
      `,
        [guildId, row.xp, userId],
      )) as {
        position: number;
      };

      const userRank: UserRank = {
        user_id: row.user_id,
        guild_id: row.guild_id,
        message_count: 0, // Será calculado separadamente
        current_rank: undefined,
        last_activity: row.last_message_at || new Date().toISOString(),
        xp: row.xp,
        level: row.level,
        position: positionData.position,
        last_message_at: row.last_message_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };

      // Atualizar cache em memória
      memUserRanks.set(userKey, userRank);

      return userRank;
    }
  } catch (error) {
    console.error("[DB] Erro ao buscar rank do usuário:", error);
  }

  // Fallback - usuário novo
  const defaultRank: UserRank = {
    user_id: userId,
    guild_id: guildId,
    message_count: 0,
    current_rank: undefined,
    last_activity: new Date().toISOString(),
    xp: 0,
    level: 1,
    position: 0,
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return memUserRanks.get(userKey) ?? defaultRank;
}

/**
 * Lista leaderboard ordenado por XP/nível para guild.
 * @param limit Quantidade máxima de entradas (default 10)
 */
export async function getLeaderboard(
  guildId: string,
  limit: number = 10,
): Promise<LeaderboardEntry[]> {
  try {
    const db = getDB();
    const rows = (await db.all(
      `
      SELECT user_id, xp, level, 
             ROW_NUMBER() OVER (ORDER BY xp DESC, level DESC, user_id ASC) as position
      FROM xp 
      WHERE guild_id = $1 
      ORDER BY xp DESC, level DESC, user_id ASC
      LIMIT $2
    `,
      [guildId, limit],
    )) as Array<{
      user_id: string;
      xp: number;
      level: number;
      position: number;
    }>;

    return rows.map((row) => ({
      user_id: row.user_id,
      xp: row.xp,
      level: row.level,
      position: row.position,
      message_count: row.xp / AVERAGE_XP_PER_MESSAGE, // Aproximação baseada em ganho médio
    }));
  } catch (error) {
    console.error("[DB] Erro ao buscar leaderboard:", error);
    return [];
  }
}

/**
 * Define (insere ou substitui) cargo de rank para nível.
 */
export async function setRankRole(
  guildId: string,
  level: number,
  roleName: string,
): Promise<boolean> {
  try {
    const db = getDB();
    const sql = `
      INSERT INTO rank_roles 
      (guild_id, level, role_name) 
      VALUES ($1, $2, $3)
      ON CONFLICT (guild_id, level) DO UPDATE SET
        role_name = EXCLUDED.role_name
    `;

    await db.run(sql, [guildId, level, roleName]);
    return true;
  } catch (error) {
    console.error("[DB] Erro ao configurar cargo de rank:", error);
    return false;
  }
}

/**
 * Remove cargo de rank associado ao nível.
 */
export async function removeRankRole(
  guildId: string,
  level: number,
): Promise<boolean> {
  try {
    const db = getDB();
    await db.run("DELETE FROM rank_roles WHERE guild_id = $1 AND level = $2", [
      guildId,
      level,
    ]);
    return true;
  } catch (error) {
    console.error("[DB] Erro ao remover cargo de rank:", error);
    return false;
  }
}

/**
 * Lista cargos de rank em ordem crescente de nível.
 */
export async function getRankRoles(guildId: string): Promise<RankRoleConfig[]> {
  try {
    const db = getDB();
    const rows = (await db.all(
      "SELECT * FROM rank_roles WHERE guild_id = $1 ORDER BY level ASC",
      [guildId],
    )) as Array<{
      id: number;
      guild_id: string;
      level: number;
      role_name: string;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.role_name,
      threshold: row.level,
      color: undefined,
      discord_role_id: undefined,
    }));
  } catch (error) {
    console.error("[DB] Erro ao listar cargos de rank:", error);
    return [];
  }
}
