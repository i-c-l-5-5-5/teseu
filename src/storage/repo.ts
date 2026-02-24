/*
SPDX-License-Identifier: MIT
*/
import { getDB } from "./db-connector.js";

/**
 * Adiciona XP a um usuário baseado em mensagens
 */
export async function addXp(userId: string, guildId: string): Promise<boolean> {
  try {
    const db = getDB();
    if (!db) {
      console.error("[DB] Banco de dados não disponível para adicionar XP");
      return false;
    }

    // Buscar XP atual
    const currentData = (await db.get(
      "SELECT xp, level FROM xp WHERE user_id = $1 AND guild_id = $2",
      [userId, guildId],
    )) as { xp: number; level: number } | undefined;

    const currentXP = currentData?.xp ?? 0;

    // Adicionar 10-15 XP por mensagem (randomizado)
    const xpGain = Math.floor(Math.random() * 6) + 10;
    const newXP = currentXP + xpGain;

    // Calcular novo nível (100 XP por nível)
    const newLevel = Math.floor(newXP / 100) + 1;

    // Atualizar ou inserir (usando sintaxe PostgreSQL ON CONFLICT)
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

    return true;
  } catch (error) {
    console.error(
      `[DB] Erro ao adicionar XP para user ${userId} na guild ${guildId}:`,
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Obtém XP de um usuário
 */
export async function getUserXP(
  userId: string,
  guildId: string,
): Promise<number> {
  try {
    const db = getDB();
    if (!db) {
      console.error("[DB] Banco de dados não disponível para buscar XP");
      return 0;
    }
    const row = (await db.get(
      "SELECT xp FROM xp WHERE user_id = $1 AND guild_id = $2",
      [userId, guildId],
    )) as { xp: number } | undefined;
    return row?.xp ?? 0;
  } catch (error) {
    console.error(
      `[DB] Erro ao buscar XP do user ${userId} na guild ${guildId}:`,
      error instanceof Error ? error.message : String(error),
    );
    return 0;
  }
}
