import { getDB } from "./db-connector.js";
export async function getRankRoles(guildId) {
    try {
        const db = getDB();
        const rows = (await db.all("SELECT * FROM rank_roles WHERE guild_id = $1 ORDER BY level ASC", [guildId]));
        return rows.map((row) => ({
            id: row.id,
            guild_id: row.guild_id,
            level: row.level,
            role_name: row.role_name,
            created_at: new Date(row.created_at),
        }));
    }
    catch (error) {
        console.error("[DB] Erro ao buscar cargos de rank:", error);
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
        console.error("[DB] Erro ao definir cargo de rank:", error);
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
