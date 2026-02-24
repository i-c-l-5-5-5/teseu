import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
let pool = null;
let connectionFailed = false;
function maskConnectionString(url) {
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.username}:***@${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
    }
    catch {
        return "[URL inválida]";
    }
}
export function getPostgresPool() {
    if (!process.env.DATABASE_URL) {
        console.log("[PostgreSQL] DATABASE_URL não configurada. SQLite será usado.");
        return null;
    }
    if (connectionFailed) {
        console.warn("[PostgreSQL] Conexão anterior falhou. Usando SQLite como fallback.");
        return null;
    }
    if (pool) {
        return pool;
    }
    try {
        const connectionString = process.env.DATABASE_URL;
        let sslOption;
        const sslEnv = (process.env.DATABASE_SSL ?? "").toLowerCase();
        let sslMode = null;
        try {
            const u = new URL(connectionString);
            sslMode = u.searchParams.get("sslmode");
        }
        catch {
        }
        if (sslEnv === "true" || sslEnv === "require") {
            sslOption = { rejectUnauthorized: false };
        }
        else if (sslMode &&
            ["require", "verify-ca", "verify-full"].includes(sslMode)) {
            sslOption = { rejectUnauthorized: false };
        }
        const baseConfig = {
            connectionString,
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 20,
            min: 2,
            allowExitOnIdle: false,
            maxUses: 7500,
        };
        if (sslOption) {
            baseConfig.ssl = sslOption;
        }
        console.log(`[PostgreSQL] Conectando a: ${maskConnectionString(connectionString)}`);
        console.log(`[PostgreSQL] SSL: ${sslOption ? "habilitado" : "desabilitado"}`);
        console.log(`[PostgreSQL] Pool config: max=${baseConfig.max}, timeout=${baseConfig.connectionTimeoutMillis}ms`);
        pool = new Pool(baseConfig);
        pool.on("error", (err) => {
            console.error("[PostgreSQL] Erro inesperado no pool de conexões:", err.message);
            console.error(`[PostgreSQL] Código: ${err.code || "N/A"}`);
            console.warn("[PostgreSQL] Mudando para SQLite como fallback devido a erro de conexão.");
            connectionFailed = true;
            pool = null;
        });
        pool.on("connect", () => {
            console.log("[PostgreSQL] Nova conexão estabelecida no pool");
        });
        pool.on("remove", () => {
            console.log("[PostgreSQL] Conexão removida do pool");
        });
        console.log("[PostgreSQL] Pool de conexões criado com sucesso.");
        initializeSchema(pool).catch((error) => {
            const err = error;
            console.error("[PostgreSQL] Falha ao inicializar schema:", err.message);
            console.error(`[PostgreSQL] Código: ${err.code || "N/A"}`);
            console.warn("[PostgreSQL] Mudando para SQLite como fallback.");
            connectionFailed = true;
            pool = null;
        });
        return pool;
    }
    catch (error) {
        const err = error;
        console.error("[PostgreSQL] Erro crítico ao conectar:", err.message || error);
        console.error(`[PostgreSQL] Código: ${err.code || "N/A"}`);
        console.warn("[PostgreSQL] Mudando para SQLite como fallback.");
        connectionFailed = true;
        return null;
    }
}
async function initializeSchema(dbPool) {
    try {
        const baseDir = process.env.NODE_ENV === "production" ? "dist" : ".";
        const schemaPath = join(process.cwd(), baseDir, "database", "schema.postgres.sql");
        const schema = readFileSync(schemaPath, "utf-8");
        await dbPool.query(schema);
        console.log("✓ Schema PostgreSQL aplicado");
    }
    catch (error) {
        console.error("Erro ao aplicar schema PostgreSQL:", error);
        throw error;
    }
}
export async function closePostgresPool() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log("[PostgreSQL] Pool de conexões fechado.");
    }
}
export async function query(text, params) {
    const dbPool = getPostgresPool();
    if (!dbPool) {
        throw new Error("[PostgreSQL] Banco de dados não disponível.");
    }
    const startTime = Date.now();
    const client = await dbPool.connect();
    try {
        const result = await Promise.race([
            client.query(text, params),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Query timeout após 5s")), 5000)),
        ]);
        const duration = Date.now() - startTime;
        if (duration > 1000) {
            console.warn(`[PostgreSQL] Query lenta (${duration}ms): ${text.substring(0, 50)}...`);
        }
        return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[PostgreSQL] Erro na query após ${duration}ms:`, error);
        throw error;
    }
    finally {
        client.release();
    }
}
export async function get(text, params) {
    const res = await query(text, params);
    return res.rows[0];
}
export async function all(text, params) {
    const res = await query(text, params);
    return res.rows;
}
export async function run(text, params) {
    return await query(text, params);
}
export function isPostgresConfigured() {
    return !!process.env.DATABASE_URL;
}
