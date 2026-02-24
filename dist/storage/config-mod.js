import { getDB } from "./db-connector.js";
const SQUAD_DEFAULT_ROLE_NAMES = {
    Analyst: "Analyst",
    Diplomat: "Diplomat",
    Sentinel: "Sentinel",
    Explorer: "Explorer",
};
export function isMemoryStorageMode() {
    const v = String(process.env.CONFIG_STORAGE_MODE || "")
        .toLowerCase()
        .trim();
    if (v === "memory" || v === "in-memory" || v === "mem")
        return true;
    if (String(process.env.NO_DB_CONFIG || "").toLowerCase() === "1")
        return true;
    return false;
}
export async function getConfig(key) {
    try {
        const db = getDB();
        const row = (await db.get("SELECT value FROM config WHERE key = $1", [
            key,
        ]));
        return row?.value ?? null;
    }
    catch (error) {
        console.error("[DB] Erro ao buscar configuração:", error);
        return null;
    }
}
export async function setConfig(key, value) {
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
        await db.run(sql, [key, value]);
        return true;
    }
    catch (error) {
        console.error("[DB] Erro ao salvar configuração:", error);
        return false;
    }
}
export async function removeConfig(key) {
    try {
        const db = getDB();
        await db.run("DELETE FROM config WHERE key = $1", [key]);
        return true;
    }
    catch (error) {
        console.error("[DB] Erro ao remover configuração:", error);
        return false;
    }
}
export async function getAllConfig() {
    try {
        const db = getDB();
        const rows = (await db.all("SELECT key, value FROM config", []));
        const result = {};
        for (const row of rows) {
            result[row.key] = row.value;
        }
        return result;
    }
    catch (error) {
        console.error("[DB] Erro ao listar configurações:", error);
        return {};
    }
}
export async function getQuizConfig(guildId) {
    try {
        const db = getDB();
        const row = (await db.get("SELECT * FROM quiz_configs WHERE guild_id = $1", [guildId]));
        if (row !== null && row !== undefined) {
            return {
                questions: JSON.parse(row.questions ?? "[]"),
                results: JSON.parse(row.results ?? "[]"),
                disclaimer: row.disclaimer !== null &&
                    row.disclaimer !== undefined &&
                    row.disclaimer !== ""
                    ? row.disclaimer
                    : "",
                enabled: Boolean(row.enabled),
            };
        }
    }
    catch (error) {
        console.error("[DB] Erro ao buscar configuração do quiz:", error);
    }
    return {
        questions: [],
        results: [],
        disclaimer: "",
        enabled: false,
    };
}
export async function setQuizConfig(guildId, config) {
    try {
        const db = getDB();
        const sql = `
      INSERT INTO quiz_configs 
      (guild_id, questions, results, disclaimer, enabled, updated_at) 
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (guild_id) DO UPDATE SET
        questions = EXCLUDED.questions,
        results = EXCLUDED.results,
        disclaimer = EXCLUDED.disclaimer,
        enabled = EXCLUDED.enabled,
        updated_at = CURRENT_TIMESTAMP
    `;
        await db.run(sql, [
            guildId,
            JSON.stringify(config.questions),
            JSON.stringify(config.results),
            config.disclaimer,
            config.enabled ? 1 : 0,
        ]);
        return true;
    }
    catch (error) {
        console.error("[DB] Erro ao salvar configuração do quiz:", error);
        return false;
    }
}
export function recordQuizAnswer(userId, guildId, questionIndex, answerIndex) {
    if (process.env.NODE_ENV === "development") {
        console.log(`[Quiz] Resposta registrada - User: ${userId.slice(0, 4)}..., Guild: ${guildId.slice(0, 4)}..., Q: ${questionIndex}, A: ${answerIndex}`);
    }
    return true;
}
export async function getSquadRoleName(guildId, squadType) {
    try {
        const configKey = `squad_role_${squadType.toLowerCase()}`;
        const customName = await getConfig(`${guildId}_${configKey}`);
        if (customName !== null && customName !== undefined && customName !== "") {
            return customName;
        }
        return SQUAD_DEFAULT_ROLE_NAMES[squadType] || squadType;
    }
    catch (error) {
        console.error("[Config] Erro ao buscar nome de cargo de squad:", error);
        return squadType;
    }
}
export const getQuiz = getQuizConfig;
