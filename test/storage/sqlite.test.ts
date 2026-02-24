/*
SPDX-License-Identifier: MIT
*/
import { getSQLite } from "@storage/sqlite.js";
import { describe, expect, it } from "vitest";

describe("SQLite Storage", () => {
  describe("getSQLite", () => {
    it("deve retornar instância do banco de dados", () => {
      const db = getSQLite();
      expect(db).toBeDefined();
    });

    it("deve retornar a mesma instância em múltiplas chamadas (singleton)", () => {
      const db1 = getSQLite();
      const db2 = getSQLite();

      expect(db1).toBe(db2);
    });

    it("deve ter métodos básicos do better-sqlite3", () => {
      const db = getSQLite();

      expect(db).toHaveProperty("prepare");
      expect(db).toHaveProperty("exec");
      expect(db).toHaveProperty("close");
      expect(typeof db.prepare).toBe("function");
    });

    it("deve executar query simples", () => {
      const db = getSQLite();
      const stmt = db.prepare("SELECT 1 as value");
      const result = stmt.get() as { value: number } | undefined;

      expect(result).toBeDefined();
      expect(result?.value).toBe(1);
    });

    it("deve suportar queries parametrizadas", () => {
      const db = getSQLite();
      const stmt = db.prepare("SELECT ? as value");
      const result = stmt.get(42) as { value: number } | undefined;

      expect(result).toBeDefined();
      expect(result?.value).toBe(42);
    });
  });

  describe("Integridade do banco", () => {
    it("deve ter tabelas essenciais criadas", () => {
      const db = getSQLite();
      const tables = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
      `,
        )
        .all() as Array<{ name: string }>;

      const tableNames = tables.map((t) => t.name);

      // Verificar algumas tabelas essenciais
      const expectedTables = ["config", "perfil", "perfil_quiz_sessions"];

      expectedTables.forEach((tableName) => {
        expect(tableNames).toContain(tableName);
      });
    });

    it("deve validar schema da tabela config", () => {
      const db = getSQLite();
      const columns = db.prepare("PRAGMA table_info(config)").all() as Array<{
        name: string;
        type: string;
      }>;

      const columnNames = columns.map((c) => c.name);

      expect(columnNames).toContain("key");
      expect(columnNames).toContain("value");
    });

    it("deve validar schema da tabela perfil", () => {
      const db = getSQLite();
      const columns = db.prepare("PRAGMA table_info(perfil)").all() as Array<{
        name: string;
        type: string;
      }>;

      const columnNames = columns.map((c) => c.name);

      expect(columnNames).toContain("user_id");
      expect(columnNames).toContain("bio");
      expect(columnNames).toContain("area");
    });
  });

  describe("Operações básicas", () => {
    it("deve permitir inserção e leitura de dados", () => {
      const db = getSQLite();
      const testKey = `test_key_${Date.now()}`;
      const testValue = "test_value";

      // Inserir
      const insertStmt = db.prepare(
        "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
      );
      insertStmt.run(testKey, testValue);

      // Ler
      const selectStmt = db.prepare("SELECT value FROM config WHERE key = ?");
      const result = selectStmt.get(testKey) as { value: string } | undefined;

      expect(result).toBeDefined();
      expect(result?.value).toBe(testValue);

      // Limpar
      db.prepare("DELETE FROM config WHERE key = ?").run(testKey);
    });

    it("deve suportar transações", () => {
      const db = getSQLite();
      const testKey = `test_transaction_${Date.now()}`;

      const transaction = db.transaction(() => {
        db.prepare(
          "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
        ).run(testKey, "value1");
        db.prepare(
          "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
        ).run(`${testKey}_2`, "value2");
      });

      expect(() => transaction()).not.toThrow();

      // Limpar
      db.prepare("DELETE FROM config WHERE key LIKE ?").run(`${testKey}%`);
    });
  });

  describe("isSQLiteConfigured", () => {
    it("deve sempre retornar true", async () => {
      const { isSQLiteConfigured } = await import("@storage/sqlite.js");
      expect(isSQLiteConfigured()).toBe(true);
    });
  });

  describe("closeSQLite", () => {
    it("deve fechar conexão e permitir reabrir", async () => {
      const { closeSQLite, getSQLite: getDB } =
        await import("@storage/sqlite.js");

      const db1 = getDB();
      expect(db1).toBeDefined();

      closeSQLite();

      const db2 = getDB();
      expect(db2).toBeDefined();

      // Verificar que nova instância funciona
      const stmt = db2.prepare("SELECT 1 as test");
      const result = stmt.get() as { test: number } | undefined;
      expect(result?.test).toBe(1);
    });
  });

  describe("backupDatabase", () => {
    it("deve retornar Buffer com dados do banco", async () => {
      const { backupDatabase } = await import("@storage/sqlite.js");
      const backup = backupDatabase();

      expect(backup).toBeDefined();
      if (backup) {
        expect(Buffer.isBuffer(backup)).toBe(true);
        expect(backup.length).toBeGreaterThan(0);
      }
    });

    it("deve retornar null se banco não estiver aberto", async () => {
      const {
        closeSQLite,
        backupDatabase,
        getSQLite: getDB,
      } = await import("@storage/sqlite.js");

      closeSQLite();
      const backup = backupDatabase();
      expect(backup).toBeNull();

      // Reabrir para outros testes
      getDB();
    });
  });

  describe("Configurações de performance", () => {
    it("deve ter WAL mode habilitado", () => {
      const db = getSQLite();
      const result = db.pragma("journal_mode", { simple: true }) as string;
      expect(result.toLowerCase()).toBe("wal");
    });

    it("deve ter foreign_keys habilitadas", () => {
      const db = getSQLite();
      const result = db.pragma("foreign_keys", { simple: true }) as number;
      expect(result).toBe(1);
    });
  });

  describe("Edge cases", () => {
    it("deve lidar com queries vazias", () => {
      const db = getSQLite();
      const stmt = db.prepare("SELECT * FROM config WHERE key = ?");
      const result = stmt.get("nonexistent-key-12345");
      expect(result).toBeUndefined();
    });

    it("deve suportar múltiplas queries em paralelo", () => {
      const db = getSQLite();

      const promises = new Array(10).fill(0).map((_, i) => {
        const stmt = db.prepare("SELECT ? as value");
        return stmt.get(i);
      });

      expect(promises).toHaveLength(10);
    });
  });

  it("getSQLite deve reutilizar instância existente", () => {
    const db1 = getSQLite();
    const db2 = getSQLite();

    expect(db1).toBe(db2); // Deve retornar a mesma instância
  });

  it("getSQLite deve funcionar com DB_PATH relativo", async () => {
    const { closeSQLite } = await import("@storage/sqlite.js");
    closeSQLite();
    delete process.env.DB_PATH;

    const db = getSQLite();
    expect(db).toBeDefined();

    // Verificar que o schema foi aplicado
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all();
    expect(Array.isArray(tables)).toBe(true);
  });

  it("pragma journal_mode deve estar configurado", () => {
    const db = getSQLite();
    const result = db.pragma("journal_mode", { simple: true });
    expect(result).toBe("wal");
  });

  it("pragma synchronous deve estar configurado", () => {
    const db = getSQLite();
    const result = db.pragma("synchronous", { simple: true });
    expect(result).toBeGreaterThan(0);
  });
});
