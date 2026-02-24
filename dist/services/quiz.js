import { getDB } from "../storage/db-connector.js";
const memQuizConfigs = new Map();
const memQuizSessions = new Map();
const memQuizResults = new Map();
export async function getQuizConfig(guildId) {
    try {
        const db = getDB();
        const row = (await db.get("SELECT * FROM quiz_configs WHERE guild_id = $1", [guildId]));
        if (row) {
            const questions = JSON.parse(row.questions || "[]");
            const results = JSON.parse(row.results || "[]");
            const disclaimer = row.disclaimer || "";
            const enabled = Boolean(row.enabled);
            const config = {
                questions,
                results,
                disclaimer,
                enabled,
            };
            memQuizConfigs.set(guildId, config);
            return config;
        }
    }
    catch (error) {
        console.error("[Postgres] Erro ao buscar configuração do quiz:", error);
    }
    return (memQuizConfigs.get(guildId) ?? {
        questions: [],
        results: [],
        disclaimer: "",
        enabled: false,
    });
}
export async function setQuizConfig(guildId, config) {
    try {
        const db = getDB();
        await db.run(`
      INSERT INTO quiz_configs (guild_id, questions, results, disclaimer, enabled, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (guild_id)
      DO UPDATE SET
        questions = EXCLUDED.questions,
        results = EXCLUDED.results,
        disclaimer = EXCLUDED.disclaimer,
        enabled = EXCLUDED.enabled,
        updated_at = NOW()
    `, [
            guildId,
            JSON.stringify(config.questions),
            JSON.stringify(config.results),
            config.disclaimer,
            config.enabled,
        ]);
        memQuizConfigs.set(guildId, config);
        return true;
    }
    catch (error) {
        console.error("[Postgres] Erro ao salvar configuração do quiz:", error);
        return false;
    }
}
export async function getQuizSession(userId, guildId) {
    const sessionKey = `${userId}-${guildId}`;
    try {
        const db = getDB();
        const row = (await db.get(`
      SELECT * FROM squad_quiz_responses
      WHERE user_id = $1 AND guild_id = $2 AND result = 'in_progress'
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId, guildId]));
        if (row) {
            const answers = JSON.parse(row.answers ?? "[]");
            const session = {
                user_id: row.user_id,
                guild_id: row.guild_id,
                current_question: 0,
                answers,
                started_at: new Date(row.created_at).getTime(),
            };
            memQuizSessions.set(sessionKey, session);
            return session;
        }
    }
    catch (error) {
        console.error("[Postgres] Erro ao buscar sessão do quiz:", error);
    }
    return memQuizSessions.get(sessionKey) || null;
}
export async function saveQuizSession(session) {
    const sessionKey = `${session.user_id}-${session.guild_id}`;
    try {
        const db = getDB();
        await db.run(`
      DELETE FROM squad_quiz_responses
      WHERE user_id = $1 AND guild_id = $2 AND result = 'in_progress'
    `, [session.user_id, session.guild_id]);
        await db.run(`
      INSERT INTO squad_quiz_responses (user_id, guild_id, result, answers)
      VALUES ($1, $2, 'in_progress', $3)
    `, [session.user_id, session.guild_id, JSON.stringify(session.answers)]);
        memQuizSessions.set(sessionKey, session);
        return true;
    }
    catch (error) {
        console.error("[Postgres] Erro ao salvar sessão do quiz:", error);
        return false;
    }
}
export async function removeQuizSession(userId, guildId) {
    const sessionKey = `${userId}-${guildId}`;
    try {
        const db = getDB();
        await db.run(`
      DELETE FROM squad_quiz_responses
      WHERE user_id = $1 AND guild_id = $2 AND result = 'in_progress'
    `, [userId, guildId]);
        memQuizSessions.delete(sessionKey);
        return true;
    }
    catch (error) {
        console.error("[Postgres] Erro ao remover sessão do quiz:", error);
        return false;
    }
}
export async function updateQuizSession(userId, guildId, updates) {
    const currentSession = await getQuizSession(userId, guildId);
    if (!currentSession)
        return false;
    const updatedSession = {
        ...currentSession,
        ...updates,
    };
    return saveQuizSession(updatedSession);
}
export async function saveQuizResult(result) {
    const resultKey = `${result.user_id}-${result.guild_id}`;
    try {
        const db = getDB();
        await db.run(`
      DELETE FROM squad_quiz_responses
      WHERE user_id = $1 AND guild_id = $2
    `, [result.user_id, result.guild_id]);
        await db.run(`
      INSERT INTO squad_quiz_responses (user_id, guild_id, result, answers)
      VALUES ($1, $2, $3, $4)
    `, [
            result.user_id,
            result.guild_id,
            result.result_key,
            JSON.stringify(result.answers),
        ]);
        memQuizResults.set(resultKey, result);
        memQuizSessions.delete(resultKey);
        return true;
    }
    catch (error) {
        console.error("[Postgres] Erro ao salvar resultado do quiz:", error);
        return false;
    }
}
export async function getQuizResult(userId, guildId) {
    const resultKey = `${userId}-${guildId}`;
    try {
        const db = getDB();
        const row = (await db.get(`
      SELECT * FROM squad_quiz_responses
      WHERE user_id = $1 AND guild_id = $2 AND result != 'in_progress'
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId, guildId]));
        if (row) {
            const answers = JSON.parse(row.answers ?? "[]");
            const result = {
                user_id: row.user_id,
                guild_id: row.guild_id,
                result_key: row.result,
                completed_at: new Date(row.created_at).toISOString(),
                answers: JSON.stringify(answers),
            };
            memQuizResults.set(resultKey, result);
            return result;
        }
    }
    catch (error) {
        console.error("[Postgres] Erro ao buscar resultado do quiz:", error);
    }
    return memQuizResults.get(resultKey) || null;
}
export async function getGuildQuizResults(guildId) {
    try {
        const db = getDB();
        const rows = (await db.all(`
      SELECT * FROM squad_quiz_responses
      WHERE guild_id = $1 AND result != 'in_progress'
      ORDER BY created_at DESC
    `, [guildId]));
        return rows.map((row) => ({
            user_id: row.user_id,
            guild_id: row.guild_id,
            result_key: row.result,
            completed_at: row.created_at,
            answers: row.answers,
        }));
    }
    catch (error) {
        console.error("[Postgres] Erro ao listar resultados do quiz:", error);
        return [];
    }
}
