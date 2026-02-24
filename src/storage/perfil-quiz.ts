import {
  defaultPerfilQuiz,
  type PerfilQuizConfig,
  type PerfilQuizSession,
} from "@barqueiro/types";

import { getDB } from "./db-connector.js";

// Re-export type for convenience
export type { PerfilQuizSession } from "@barqueiro/types";

function isPerfilQuizConfig(data: unknown): data is PerfilQuizConfig {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as PerfilQuizConfig).enabled === "boolean" &&
    Array.isArray((data as PerfilQuizConfig).questions) &&
    Array.isArray((data as PerfilQuizConfig).results)
  );
}

/**
 * Obtém a configuração do quiz de perfil
 */
export async function getPerfilQuizConfig(): Promise<PerfilQuizConfig> {
  try {
    const db = getDB();
    const row = (await db.get(
      "SELECT config FROM perfil_quiz_config WHERE id = 1",
      [],
    )) as { config: string } | undefined;

    if (!row?.config) return defaultPerfilQuiz();

    const parsed = JSON.parse(row.config) as unknown;
    if (isPerfilQuizConfig(parsed)) return parsed;
  } catch (error) {
    console.error("[DB] Erro ao buscar config do quiz de perfil:", error);
  }

  return defaultPerfilQuiz();
}

/**
 * Salva a configuração do quiz de perfil
 */
export async function setPerfilQuizConfig(
  config: PerfilQuizConfig,
): Promise<boolean> {
  try {
    const db = getDB();
    const sql = `
      INSERT INTO perfil_quiz_config 
      (id, config, updated_at) 
      VALUES (1, $1, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        config = EXCLUDED.config,
        updated_at = CURRENT_TIMESTAMP
    `;

    await db.run(sql, [JSON.stringify(config)]);
    return true;
  } catch (error) {
    console.error("[DB] Erro ao salvar config do quiz de perfil:", error);
    return false;
  }
}

/**
 * Verifica se o quiz de perfil está pronto para ser usado
 */
export async function isPerfilQuizReady(): Promise<boolean> {
  const config = await getPerfilQuizConfig();
  return (
    config.enabled &&
    config.questions.length > 0 &&
    config.results.length > 0 &&
    !!config.channelId
  );
}

/**
 * Inicia uma nova sessão de quiz de perfil
 */
export async function startPerfilQuizSession(
  userId: string,
  guildId: string,
): Promise<PerfilQuizSession> {
  const session: PerfilQuizSession = {
    userId,
    guildId,
    currentQuestion: 0,
    answers: [],
    startedAt: Date.now(),
  };

  try {
    const db = getDB();
    const sql = `
      INSERT INTO perfil_quiz_sessions 
      (user_id, guild_id, current_question, answers, started_at, expires_at) 
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '1 hour')
      ON CONFLICT (user_id, guild_id) DO UPDATE SET
        current_question = EXCLUDED.current_question,
        answers = EXCLUDED.answers,
        started_at = CURRENT_TIMESTAMP,
        expires_at = CURRENT_TIMESTAMP + interval '1 hour'
    `;

    await db.run(sql, [userId, guildId, 0, JSON.stringify(session.answers)]);
  } catch (error) {
    console.error("[DB] Erro ao salvar sessão do quiz:", error);
  }

  return session;
}

/**
 * Obtém sessão ativa do quiz de perfil
 */
export async function getPerfilQuizSession(
  userId: string,
  guildId: string,
): Promise<PerfilQuizSession | null> {
  try {
    const db = getDB();
    const row = (await db.get(
      `
      SELECT * FROM perfil_quiz_sessions 
      WHERE user_id = $1 AND guild_id = $2 AND expires_at > CURRENT_TIMESTAMP
    `,
      [userId, guildId],
    )) as
      | {
          user_id: string;
          guild_id: string;
          current_question: number;
          answers: string;
          started_at: string;
        }
      | undefined;

    if (!row) return null;

    return {
      userId: row.user_id,
      guildId: row.guild_id,
      currentQuestion: row.current_question,
      answers: JSON.parse(row.answers || "[]") as Array<{
        questionIndex: number;
        answerIndex: number;
        result: string;
        weight?: number;
      }>,
      startedAt: new Date(row.started_at).getTime(),
    };
  } catch (error) {
    console.error("[DB] Erro ao buscar sessão do quiz:", error);
    return null;
  }
}

/**
 * Atualiza sessão do quiz de perfil
 */
export async function updatePerfilQuizSession(
  session: PerfilQuizSession,
): Promise<boolean> {
  try {
    const db = getDB();
    const sql = `
      UPDATE perfil_quiz_sessions 
      SET current_question = $1, answers = $2, expires_at = CURRENT_TIMESTAMP + interval '1 hour'
      WHERE user_id = $3 AND guild_id = $4
    `;

    await db.run(sql, [
      session.currentQuestion,
      JSON.stringify(session.answers),
      session.userId,
      session.guildId,
    ]);
    return true;
  } catch (error) {
    console.error("[DB] Erro ao atualizar sessão do quiz:", error);
    return false;
  }
}

/**
 * Remove sessão do quiz de perfil
 */
export async function clearPerfilQuizSession(
  userId: string,
  guildId: string,
): Promise<void> {
  try {
    const db = getDB();
    await db.run(
      "DELETE FROM perfil_quiz_sessions WHERE user_id = $1 AND guild_id = $2",
      [userId, guildId],
    );
  } catch (error) {
    console.error("[DB] Erro ao limpar sessão do quiz:", error);
  }
}
