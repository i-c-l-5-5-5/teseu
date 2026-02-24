import { all as pgAll, closePostgresPool, get as pgGet, getPostgresPool, isPostgresConfigured, query as pgQuery, run as pgRun, } from "./postgres.js";
const postgresDB = {
    query: async (text, params) => {
        return pgQuery(text, params);
    },
    get: async (text, params) => {
        return pgGet(text, params);
    },
    all: async (text, params) => {
        return pgAll(text, params);
    },
    run: async (text, params) => {
        const res = await pgRun(text, params);
        const firstRow = res.rows?.[0];
        return {
            changes: res.rowCount ?? 0,
            lastInsertRowid: firstRow?.id ?? 0,
        };
    },
    close: async () => {
        await closePostgresPool();
    },
};
export function getDB() {
    if (!isPostgresConfigured()) {
        const msg = "[DB] PostgreSQL não configurado. SQLite foi removido do projeto.";
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
export async function closeDB() {
    await closePostgresPool();
}
export function isDBConfigured() {
    return isPostgresConfigured();
}
