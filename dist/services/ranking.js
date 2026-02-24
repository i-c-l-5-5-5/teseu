import { isChannelAllowed } from "../storage/channel-config.js";
import { getDB } from "../storage/db-connector.js";
const MIN_XP_GAIN = 10;
const MAX_XP_GAIN = 15;
const XP_PER_LEVEL = 100;
const AVERAGE_XP_PER_MESSAGE = 10;
const memRankConfigs = new Map();
const memUserRanks = new Map();
export async function getRankConfig(guildId) {
    try {
        const db = getDB();
        const row = (await db.get("SELECT value FROM config WHERE key = $1", [
            `rank_config_${guildId}`,
        ]));
        if (row) {
            const config = JSON.parse(row.value);
            const enabled = Boolean(config.enabled);
            const roles = Array.isArray(config.roles) ? config.roles : [];
            return {
                enabled,
                roles,
            };
        }
    }
    catch (error) {
        console.error("[DB] Erro ao buscar configuração de ranking:", error);
    }
    return (memRankConfigs.get(guildId) ?? {
        enabled: false,
        roles: [],
    });
}
export async function setRankConfig(guildId, config) {
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
        memRankConfigs.set(guildId, config);
        return true;
    }
    catch (error) {
        console.error("[DB] Erro ao salvar configuração de ranking:", error);
        return false;
    }
}
export async function addMessageXP(userId, guildId, channelId) {
    try {
        if (channelId &&
            !(await isChannelAllowed(guildId, channelId, "xp_channels"))) {
            return {
                newLevel: 1,
                leveledUp: false,
            };
        }
        const db = getDB();
        const currentData = (await db.get("SELECT * FROM xp WHERE user_id = $1 AND guild_id = $2", [userId, guildId]));
        const currentXP = currentData?.xp ?? 0;
        const currentLevel = currentData?.level ?? 1;
        const xpGain = Math.floor(Math.random() * (MAX_XP_GAIN - MIN_XP_GAIN + 1)) + MIN_XP_GAIN;
        const newXP = currentXP + xpGain;
        const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
        const leveledUp = newLevel > currentLevel;
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
        let newRank;
        if (leveledUp) {
            const rankData = (await db.get("SELECT role_name FROM rank_roles WHERE guild_id = $1 AND level = $2", [guildId, newLevel]));
            if (rankData !== null && rankData !== undefined) {
                newRank = rankData.role_name;
            }
        }
        return {
            newLevel,
            leveledUp,
            newRank,
        };
    }
    catch (error) {
        console.error("[DB] Erro ao adicionar XP por mensagem:", error);
        return {
            newLevel: 1,
            leveledUp: false,
        };
    }
}
export async function getUserXP(userId, guildId) {
    try {
        const db = getDB();
        const row = (await db.get("SELECT xp FROM xp WHERE user_id = $1 AND guild_id = $2", [userId, guildId]));
        return row?.xp ?? 0;
    }
    catch (error) {
        console.error("[DB] Erro ao buscar XP do usuário:", error);
        return 0;
    }
}
export async function getUserRank(userId, guildId) {
    const userKey = `${userId}-${guildId}`;
    try {
        const db = getDB();
        const row = (await db.get("SELECT * FROM xp WHERE user_id = $1 AND guild_id = $2", [userId, guildId]));
        if (row) {
            const positionData = (await db.get(`
        SELECT COUNT(*) + 1 as position 
        FROM xp 
        WHERE guild_id = $1 
        AND (xp > $2 OR (xp = $2 AND user_id < $3))
      `, [guildId, row.xp, userId]));
            const userRank = {
                user_id: row.user_id,
                guild_id: row.guild_id,
                message_count: 0,
                current_rank: undefined,
                last_activity: row.last_message_at || new Date().toISOString(),
                xp: row.xp,
                level: row.level,
                position: positionData.position,
                last_message_at: row.last_message_at,
                created_at: row.created_at,
                updated_at: row.updated_at,
            };
            memUserRanks.set(userKey, userRank);
            return userRank;
        }
    }
    catch (error) {
        console.error("[DB] Erro ao buscar rank do usuário:", error);
    }
    const defaultRank = {
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
export async function getLeaderboard(guildId, limit = 10) {
    try {
        const db = getDB();
        const rows = (await db.all(`
      SELECT user_id, xp, level, 
             ROW_NUMBER() OVER (ORDER BY xp DESC, level DESC, user_id ASC) as position
      FROM xp 
      WHERE guild_id = $1 
      ORDER BY xp DESC, level DESC, user_id ASC
      LIMIT $2
    `, [guildId, limit]));
        return rows.map((row) => ({
            user_id: row.user_id,
            xp: row.xp,
            level: row.level,
            position: row.position,
            message_count: row.xp / AVERAGE_XP_PER_MESSAGE,
        }));
    }
    catch (error) {
        console.error("[DB] Erro ao buscar leaderboard:", error);
        return [];
    }
}
export async function setRankRole(guildId, level, roleName) {
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
    }
    catch (error) {
        console.error("[DB] Erro ao configurar cargo de rank:", error);
        return false;
    }
}
export async function removeRankRole(guildId, level) {
    try {
        const db = getDB();
        await db.run("DELETE FROM rank_roles WHERE guild_id = $1 AND level = $2", [
            guildId,
            level,
        ]);
        return true;
    }
    catch (error) {
        console.error("[DB] Erro ao remover cargo de rank:", error);
        return false;
    }
}
export async function getRankRoles(guildId) {
    try {
        const db = getDB();
        const rows = (await db.all("SELECT * FROM rank_roles WHERE guild_id = $1 ORDER BY level ASC", [guildId]));
        return rows.map((row) => ({
            id: row.id,
            name: row.role_name,
            threshold: row.level,
            color: undefined,
            discord_role_id: undefined,
        }));
    }
    catch (error) {
        console.error("[DB] Erro ao listar cargos de rank:", error);
        return [];
    }
}
