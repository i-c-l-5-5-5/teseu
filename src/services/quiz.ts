/*
SPDX-License-Identifier: MIT
*/
import type {
  QuizQuestion,
  QuizResult,
  QuizSession,
  SquadQuizConfig,
  UserQuizResult,
} from "@barqueiro/types";

import { getDB } from "@storage/db-connector.js";

// Cache em memória (fallback)
const memQuizConfigs = new Map<string, SquadQuizConfig>();
const memQuizSessions = new Map<string, QuizSession>();
const memQuizResults = new Map<string, UserQuizResult>();

/**
 * Obtém a configuração do quiz de um servidor
 */
export async function getQuizConfig(guildId: string): Promise<SquadQuizConfig> {
  try {
    const db = getDB();

    const row = (await db.get(
      "SELECT * FROM quiz_configs WHERE guild_id = $1",
      [guildId],
    )) as
      | {
          guild_id: string;
          questions: string;
          results: string;
          disclaimer: string;
          enabled: boolean;
        }
      | undefined;

    if (row) {
      const questions = JSON.parse(row.questions || "[]") as QuizQuestion[];
      const results = JSON.parse(row.results || "[]") as QuizResult[];
      const disclaimer = row.disclaimer || "";
      const enabled = Boolean(row.enabled);

      const config: SquadQuizConfig = {
        questions,
        results,
        disclaimer,
        enabled,
      };

      memQuizConfigs.set(guildId, config);
      return config;
    }
  } catch (error) {
    console.error("[Postgres] Erro ao buscar configuração do quiz:", error);
  }

  return (
    memQuizConfigs.get(guildId) ?? {
      questions: [],
      results: [],
      disclaimer: "",
      enabled: false,
    }
  );
}

/**
 * Salva a configuração do quiz
 */
export async function setQuizConfig(
  guildId: string,
  config: SquadQuizConfig,
): Promise<boolean> {
  try {
    const db = getDB();

    await db.run(
      `
      INSERT INTO quiz_configs (guild_id, questions, results, disclaimer, enabled, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (guild_id)
      DO UPDATE SET
        questions = EXCLUDED.questions,
        results = EXCLUDED.results,
        disclaimer = EXCLUDED.disclaimer,
        enabled = EXCLUDED.enabled,
        updated_at = NOW()
    `,
      [
        guildId,
        JSON.stringify(config.questions),
        JSON.stringify(config.results),
        config.disclaimer,
        config.enabled,
      ],
    );

    memQuizConfigs.set(guildId, config);
    return true;
  } catch (error) {
    console.error("[Postgres] Erro ao salvar configuração do quiz:", error);
    return false;
  }
}

/**
 * Obtém uma sessão de quiz ativa
 */
export async function getQuizSession(
  userId: string,
  guildId: string,
): Promise<QuizSession | null> {
  const sessionKey = `${userId}-${guildId}`;

  try {
    const db = getDB();

    const row = (await db.get(
      `
      SELECT * FROM squad_quiz_responses
      WHERE user_id = $1 AND guild_id = $2 AND result = 'in_progress'
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [userId, guildId],
    )) as
      | {
          user_id: string;
          guild_id: string;
          result: string;
          answers: string;
          created_at: string;
        }
      | undefined;

    if (row) {
      const answers = JSON.parse(row.answers ?? "[]") as Array<{
        questionIndex: number;
        answerIndex: number;
        result: string;
        weight?: number;
      }>;

      const session: QuizSession = {
        user_id: row.user_id,
        guild_id: row.guild_id,
        current_question: 0,
        answers,
        started_at: new Date(row.created_at).getTime(),
      };

      memQuizSessions.set(sessionKey, session);
      return session;
    }
  } catch (error) {
    console.error("[Postgres] Erro ao buscar sessão do quiz:", error);
  }

  return memQuizSessions.get(sessionKey) || null;
}

/**
 * Salva uma sessão de quiz
 */
export async function saveQuizSession(session: QuizSession): Promise<boolean> {
  const sessionKey = `${session.user_id}-${session.guild_id}`;

  try {
    const db = getDB();

    await db.run(
      `
      DELETE FROM squad_quiz_responses
      WHERE user_id = $1 AND guild_id = $2 AND result = 'in_progress'
    `,
      [session.user_id, session.guild_id],
    );

    await db.run(
      `
      INSERT INTO squad_quiz_responses (user_id, guild_id, result, answers)
      VALUES ($1, $2, 'in_progress', $3)
    `,
      [session.user_id, session.guild_id, JSON.stringify(session.answers)],
    );

    memQuizSessions.set(sessionKey, session);
    return true;
  } catch (error) {
    console.error("[Postgres] Erro ao salvar sessão do quiz:", error);
    return false;
  }
}

/**
 * Remove uma sessão de quiz
 */
export async function removeQuizSession(
  userId: string,
  guildId: string,
): Promise<boolean> {
  const sessionKey = `${userId}-${guildId}`;

  try {
    const db = getDB();

    await db.run(
      `
      DELETE FROM squad_quiz_responses
      WHERE user_id = $1 AND guild_id = $2 AND result = 'in_progress'
    `,
      [userId, guildId],
    );

    memQuizSessions.delete(sessionKey);
    return true;
  } catch (error) {
    console.error("[Postgres] Erro ao remover sessão do quiz:", error);
    return false;
  }
}

/**
 * Atualiza o progresso da sessão
 */
export async function updateQuizSession(
  userId: string,
  guildId: string,
  updates: Partial<QuizSession>,
): Promise<boolean> {
  const currentSession = await getQuizSession(userId, guildId);
  if (!currentSession) return false;

  const updatedSession: QuizSession = {
    ...currentSession,
    ...updates,
  };

  return saveQuizSession(updatedSession);
}

/**
 * Salva o resultado final do quiz
 */
export async function saveQuizResult(result: UserQuizResult): Promise<boolean> {
  const resultKey = `${result.user_id}-${result.guild_id}`;

  try {
    const db = getDB();

    await db.run(
      `
      DELETE FROM squad_quiz_responses
      WHERE user_id = $1 AND guild_id = $2
    `,
      [result.user_id, result.guild_id],
    );

    await db.run(
      `
      INSERT INTO squad_quiz_responses (user_id, guild_id, result, answers)
      VALUES ($1, $2, $3, $4)
    `,
      [
        result.user_id,
        result.guild_id,
        result.result_key,
        JSON.stringify(result.answers),
      ],
    );

    memQuizResults.set(resultKey, result);
    memQuizSessions.delete(resultKey);

    return true;
  } catch (error) {
    console.error("[Postgres] Erro ao salvar resultado do quiz:", error);
    return false;
  }
}

/**
 * Obtém o resultado do quiz de um usuário
 */
export async function getQuizResult(
  userId: string,
  guildId: string,
): Promise<UserQuizResult | null> {
  const resultKey = `${userId}-${guildId}`;

  try {
    const db = getDB();

    const row = (await db.get(
      `
      SELECT * FROM squad_quiz_responses
      WHERE user_id = $1 AND guild_id = $2 AND result != 'in_progress'
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [userId, guildId],
    )) as
      | {
          user_id: string;
          guild_id: string;
          result: string;
          created_at: string;
          answers: string;
        }
      | undefined;

    if (row) {
      const answers = JSON.parse(row.answers ?? "[]");

      const result: UserQuizResult = {
        user_id: row.user_id,
        guild_id: row.guild_id,
        result_key: row.result,
        completed_at: new Date(row.created_at).toISOString(),
        answers: JSON.stringify(answers),
      };

      memQuizResults.set(resultKey, result);
      return result;
    }
  } catch (error) {
    console.error("[Postgres] Erro ao buscar resultado do quiz:", error);
  }

  return memQuizResults.get(resultKey) || null;
}

/**
 * Lista todos os resultados de quiz de uma guild
 */
export async function getGuildQuizResults(
  guildId: string,
): Promise<UserQuizResult[]> {
  try {
    const db = getDB();

    const rows = (await db.all(
      `
      SELECT * FROM squad_quiz_responses
      WHERE guild_id = $1 AND result != 'in_progress'
      ORDER BY created_at DESC
    `,
      [guildId],
    )) as Array<{
      user_id: string;
      guild_id: string;
      result: string;
      created_at: string;
      answers: string;
    }>;

    return rows.map((row) => ({
      user_id: row.user_id,
      guild_id: row.guild_id,
      result_key: row.result,
      completed_at: row.created_at,
      answers: row.answers,
    }));
  } catch (error) {
    console.error("[Postgres] Erro ao listar resultados do quiz:", error);
    return [];
  }
}
