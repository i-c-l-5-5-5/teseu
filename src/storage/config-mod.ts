/*
SPDX-License-Identifier: MIT
*/
import type { SquadQuizConfig } from "@barqueiro/types";

import { getDB } from "./db-connector.js";

/**
 * Nomes padrão para cargos de Squad quando não há customização persistida.
 * @remarks
 * Extraído para reduzir magic-constants dentro da função de resolução.
 */
const SQUAD_DEFAULT_ROLE_NAMES: Record<string, string> = {
  Analyst: "Analyst",
  Diplomat: "Diplomat",
  Sentinel: "Sentinel",
  Explorer: "Explorer",
};

/**
 * Indica se o modo de armazenamento em memória está ativo.
 * Usa variável primária `CONFIG_STORAGE_MODE` (valores aceitos: memory | in-memory | mem)
 * e mantém suporte legível à variável legada `NO_DB_CONFIG=1`.
 * @returns true se devemos evitar persistência e operar somente em memória.
 */
export function isMemoryStorageMode(): boolean {
  const v = String(process.env.CONFIG_STORAGE_MODE || "")
    .toLowerCase()
    .trim();
  if (v === "memory" || v === "in-memory" || v === "mem") return true;
  // Back-compat: variável antiga
  if (String(process.env.NO_DB_CONFIG || "").toLowerCase() === "1") return true;
  return false;
}

/**
 * Obtém valor de configuração genérico via chave.
 * @param key Chave textual (coluna `key` na tabela `config`).
 * @returns string ou null se inexistente/erro.
 */
export async function getConfig(key: string): Promise<string | null> {
  try {
    const db = getDB();
    const row = (await db.get("SELECT value FROM config WHERE key = $1", [
      key,
    ])) as { value: string } | undefined;
    return row?.value ?? null;
  } catch (error) {
    console.error("[DB] Erro ao buscar configuração:", error);
    return null;
  }
}

/**
 * Define (insere ou substitui) valor de configuração.
 * Atualiza `updated_at` automaticamente via CURRENT_TIMESTAMP.
 * @param key Chave da configuração
 * @param value Valor a persistir
 * @returns true em sucesso, false em erro.
 */
export async function setConfig(key: string, value: string): Promise<boolean> {
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
  } catch (error) {
    console.error("[DB] Erro ao salvar configuração:", error);
    return false;
  }
}

/**
 * Remove uma configuração existente.
 * @param key Chave da configuração
 * @returns true em sucesso, false em erro.
 */
export async function removeConfig(key: string): Promise<boolean> {
  try {
    const db = getDB();
    await db.run("DELETE FROM config WHERE key = $1", [key]);
    return true;
  } catch (error) {
    console.error("[DB] Erro ao remover configuração:", error);
    return false;
  }
}

/**
 * Lista todas as configurações (mapa key->value).
 * @returns Objeto com pares acumulados ou vazio em caso de erro.
 */
export async function getAllConfig(): Promise<Record<string, string>> {
  try {
    const db = getDB();
    const rows = (await db.all("SELECT key, value FROM config", [])) as Array<{
      key: string;
      value: string;
    }>;

    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  } catch (error) {
    console.error("[DB] Erro ao listar configurações:", error);
    return {};
  }
}

// === Funções específicas de Quiz ===

/**
 * Obtém configuração do quiz de uma guild.
 * Faz parse de colunas JSON (questions, results); retorna objeto vazio em erro.
 * @param guildId Identificador da guild
 * @returns Configuração de quiz (com fallback default se não houver registro)
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

    if (row !== null && row !== undefined) {
      return {
        questions: JSON.parse(
          row.questions ?? "[]",
        ) as SquadQuizConfig["questions"],
        results: JSON.parse(row.results ?? "[]") as SquadQuizConfig["results"],
        disclaimer:
          row.disclaimer !== null &&
          row.disclaimer !== undefined &&
          row.disclaimer !== ""
            ? row.disclaimer
            : "",
        enabled: Boolean(row.enabled),
      };
    }
  } catch (error) {
    console.error("[DB] Erro ao buscar configuração do quiz:", error);
  }

  // Fallback para configuração vazia
  return {
    questions: [],
    results: [],
    disclaimer: "",
    enabled: false,
  };
}

/**
 * Persiste configuração do quiz da guild.
 * Serializa arrays para JSON e converte boolean enabled para 0/1.
 * @param guildId Identificador da guild
 * @param config Estrutura de configuração
 * @returns true em sucesso
 */
export async function setQuizConfig(
  guildId: string,
  config: SquadQuizConfig,
): Promise<boolean> {
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
  } catch (error) {
    console.error("[DB] Erro ao salvar configuração do quiz:", error);
    return false;
  }
}

/**
 * Registra resposta individual de quiz.
 * @deprecated Stub mantido para compatibilidade; implementar persistência quando necessário.
 * @returns true sempre (placeholder)
 */
export function recordQuizAnswer(
  userId: string,
  guildId: string,
  questionIndex: number,
  answerIndex: number,
): boolean {
  // Esta função seria implementada para registrar respostas individuais
  // Por enquanto, retorna true para compatibilidade
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[Quiz] Resposta registrada - User: ${userId.slice(0, 4)}..., Guild: ${guildId.slice(0, 4)}..., Q: ${questionIndex}, A: ${answerIndex}`,
    );
  }
  return true;
}

/**
 * Resolve nome de cargo de Squad considerando customização persistida.
 * @param guildId Guild alvo
 * @param squadType Tipo do squad (ex: Analyst, Diplomat)
 * @returns Nome customizado ou padrão.
 * @remarks
 * Chave de persistência: `${guildId}_squad_role_${squadType.toLowerCase()}`.
 */
export async function getSquadRoleName(
  guildId: string,
  squadType: string,
): Promise<string> {
  try {
    // Verificar se existe configuração personalizada
    // Esta é uma chave de configuração dinâmica, não um segredo
    const configKey = `squad_role_${squadType.toLowerCase()}`;
    const customName = await getConfig(`${guildId}_${configKey}`);

    if (customName !== null && customName !== undefined && customName !== "") {
      return customName;
    }

    // Retornar padrão se não tiver customização
    return SQUAD_DEFAULT_ROLE_NAMES[squadType] || squadType;
  } catch (error) {
    console.error("[Config] Erro ao buscar nome de cargo de squad:", error);
    return squadType; // Fallback para o próprio tipo como nome
  }
}

/**
 * Wrapper legado para compatibilidade com código antigo que invoca `getQuiz`.
 * @deprecated Use `getQuizConfig`.
 */
export const getQuiz = getQuizConfig;
