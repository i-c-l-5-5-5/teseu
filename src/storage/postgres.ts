/*
SPDX-License-Identifier: MIT
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

let pool: Pool | null = null;
let connectionFailed = false;

/**
 * Mascara informações sensíveis da connection string para logs
 */
function maskConnectionString(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.username}:***@${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
  } catch {
    return "[URL inválida]";
  }
}

/**
 * Retorna o pool de conexão com o PostgreSQL.
 * Se a variável de ambiente DATABASE_URL não estiver definida, retorna null.
 * Implementa fallback automático para SQLite em caso de falha.
 */
export function getPostgresPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    console.log(
      "[PostgreSQL] DATABASE_URL não configurada. SQLite será usado.",
    );
    return null;
  }

  // Se a conexão já falhou anteriormente, não tenta novamente
  if (connectionFailed) {
    console.warn(
      "[PostgreSQL] Conexão anterior falhou. Usando SQLite como fallback.",
    );
    return null;
  }

  if (pool) {
    return pool;
  }

  try {
    const connectionString = process.env.DATABASE_URL;
    let sslOption: boolean | { rejectUnauthorized: boolean } | undefined;
    const sslEnv = (process.env.DATABASE_SSL ?? "").toLowerCase();
    let sslMode: string | null = null;
    try {
      // Pode falhar se a string não for URL válida; ignoramos nesse caso
      const u = new URL(connectionString);
      sslMode = u.searchParams.get("sslmode");
    } catch {
      // ignore
    }

    if (sslEnv === "true" || sslEnv === "require") {
      sslOption = { rejectUnauthorized: false };
    } else if (
      sslMode &&
      ["require", "verify-ca", "verify-full"].includes(sslMode)
    ) {
      sslOption = { rejectUnauthorized: false };
    }

    const baseConfig: Record<string, unknown> = {
      connectionString,
      // Configurações de timeout e retry
      connectionTimeoutMillis: 10000, // 10s para conectar
      idleTimeoutMillis: 30000, // 30s idle antes de fechar
      max: 20, // Máximo de conexões no pool (aumentado)
      min: 2, // Mínimo de conexões mantidas
      allowExitOnIdle: false, // Não sair se todas as conexões estiverem idle
      maxUses: 7500, // Número máximo de usos antes de recriar conexão
    };

    if (sslOption) {
      baseConfig.ssl = sslOption;
    }

    console.log(
      `[PostgreSQL] Conectando a: ${maskConnectionString(connectionString)}`,
    );
    console.log(
      `[PostgreSQL] SSL: ${sslOption ? "habilitado" : "desabilitado"}`,
    );
    console.log(
      `[PostgreSQL] Pool config: max=${baseConfig.max}, timeout=${baseConfig.connectionTimeoutMillis}ms`,
    );

    pool = new Pool(
      baseConfig as {
        connectionString: string;
        ssl?: boolean | { rejectUnauthorized: boolean };
        connectionTimeoutMillis: number;
        idleTimeoutMillis: number;
        max: number;
      },
    );

    pool.on("error", (err: Error & { code?: string }) => {
      console.error(
        "[PostgreSQL] Erro inesperado no pool de conexões:",
        err.message,
      );
      console.error(`[PostgreSQL] Código: ${err.code || "N/A"}`);
      console.warn(
        "[PostgreSQL] Mudando para SQLite como fallback devido a erro de conexão.",
      );
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
    initializeSchema(pool).catch((error: unknown) => {
      const err = error as { message?: string; code?: string };
      console.error("[PostgreSQL] Falha ao inicializar schema:", err.message);
      console.error(`[PostgreSQL] Código: ${err.code || "N/A"}`);
      console.warn("[PostgreSQL] Mudando para SQLite como fallback.");
      connectionFailed = true;
      pool = null;
    });

    return pool;
  } catch (error) {
    const err = error as { message?: string; code?: string };
    console.error(
      "[PostgreSQL] Erro crítico ao conectar:",
      err.message || error,
    );
    console.error(`[PostgreSQL] Código: ${err.code || "N/A"}`);
    console.warn("[PostgreSQL] Mudando para SQLite como fallback.");
    connectionFailed = true;
    return null;
  }
}

/**
 * Aplica o esquema do banco de dados (PostgreSQL).
 */
async function initializeSchema(dbPool: Pool): Promise<void> {
  try {
    // Em produção (dist/), busca em dist/database/
    // Em desenvolvimento, busca em database/
    const baseDir = process.env.NODE_ENV === "production" ? "dist" : ".";
    const schemaPath = join(
      process.cwd(),
      baseDir,
      "database",
      "schema.postgres.sql",
    );
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- Safe: path is internally controlled
    const schema = readFileSync(schemaPath, "utf-8");
    await dbPool.query(schema);
    console.log("✓ Schema PostgreSQL aplicado");
  } catch (error) {
    console.error("Erro ao aplicar schema PostgreSQL:", error);
    throw error;
  }
}

/**
 * Fecha o pool de conexões.
 */
export async function closePostgresPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("[PostgreSQL] Pool de conexões fechado.");
  }
}

/**
 * Executa uma query no banco de dados.
 * @param text A query SQL.
 * @param params Os parâmetros da query.
 * @returns O resultado da query.
 */
export async function query(
  text: string,
  params?: unknown[],
): Promise<{ rows: unknown[]; rowCount: number }> {
  const dbPool = getPostgresPool();
  if (!dbPool) {
    throw new Error("[PostgreSQL] Banco de dados não disponível.");
  }

  const startTime = Date.now();
  const client = await dbPool.connect();

  try {
    // Timeout de 5 segundos para a query
    const result = await Promise.race([
      client.query(text, params),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout após 5s")), 5000),
      ),
    ]);

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(
        `[PostgreSQL] Query lenta (${duration}ms): ${text.substring(0, 50)}...`,
      );
    }

    return { rows: result.rows as unknown[], rowCount: result.rowCount ?? 0 };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PostgreSQL] Erro na query após ${duration}ms:`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Executa uma query que retorna uma única linha.
 * @param text A query SQL.
 * @param params Os parâmetros da query.
 * @returns A linha do resultado ou undefined.
 */
export async function get(text: string, params?: unknown[]): Promise<unknown> {
  const res = await query(text, params);
  return res.rows[0];
}

/**
 * Executa uma query que retorna todas as linhas.
 * @param text A query SQL.
 * @param params Os parâmetros da query.
 * @returns Um array com as linhas do resultado.
 */
export async function all(
  text: string,
  params?: unknown[],
): Promise<unknown[]> {
  const res = await query(text, params);
  return res.rows;
}

/**
 * Executa uma query que não retorna dados (INSERT, UPDATE, DELETE).
 * @param text A query SQL.
 * @param params Os parâmetros da query.
 * @returns O resultado da query.
 */
export async function run(
  text: string,
  params?: unknown[],
): Promise<{ rows: unknown[]; rowCount: number }> {
  return await query(text, params);
}

/**
 * Verifica se o PostgreSQL está configurado.
 */
export function isPostgresConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
