/*
SPDX-License-Identifier: MIT
*/

import {
  all as pgAll,
  closePostgresPool,
  get as pgGet,
  getPostgresPool,
  isPostgresConfigured,
  query as pgQuery,
  run as pgRun,
} from "./postgres.js";

// Tipos de retorno unificados
export interface DBResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface DB {
  query: (
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
  get: (text: string, params?: unknown[]) => Promise<unknown>;
  all: (text: string, params?: unknown[]) => Promise<unknown[]>;
  run: (text: string, params?: unknown[]) => Promise<DBResult>;
  close: () => Promise<void>;
}

// Adapter PostgreSQL (sem SQLite)
const postgresDB: DB = {
  query: async (text: string, params?: unknown[]) => {
    return pgQuery(text, params);
  },

  get: async (text: string, params?: unknown[]) => {
    return pgGet(text, params);
  },

  all: async (text: string, params?: unknown[]) => {
    return pgAll(text, params);
  },

  run: async (text: string, params?: unknown[]): Promise<DBResult> => {
    const res = await pgRun(text, params);

    // tenta extrair id do RETURNING (se existir)
    const firstRow = res.rows?.[0] as { id?: number } | undefined;

    return {
      changes: res.rowCount ?? 0,
      lastInsertRowid: firstRow?.id ?? 0,
    };
  },

  close: async () => {
    await closePostgresPool();
  },
};

/**
 * Retorna o adapter de banco (apenas PostgreSQL).
 */
export function getDB(): DB {
  if (!isPostgresConfigured()) {
    const msg =
      "[DB] PostgreSQL não configurado. SQLite foi removido do projeto.";
    console.error(msg);
    throw new Error(msg);
  }

  const pool = getPostgresPool();
  if (!pool) {
    const msg = "[DB] Pool do PostgreSQL não disponível.";
    console.error(msg);
    throw new Error(msg);
  }

  return postgresDB;
}

/**
 * Fecha pool do PostgreSQL.
 */
export async function closeDB(): Promise<void> {
  await closePostgresPool();
}

/**
 * Verifica se o banco está configurado.
 */
export function isDBConfigured(): boolean {
  return isPostgresConfigured();
}
