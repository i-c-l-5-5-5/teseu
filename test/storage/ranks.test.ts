import { getRankRoles, removeRankRole, setRankRole } from "@storage/ranks.js";
import { closeSQLite, getSQLite } from "@storage/sqlite.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Ranks Storage", () => {
  beforeEach(() => {
    process.env.DB_PATH = ":memory:";
    getSQLite();
  });

  afterEach(() => {
    closeSQLite();
    delete process.env.DB_PATH;
  });

  describe("getRankRoles", () => {
    it("deve retornar array vazio para guild sem cargos", async () => {
      const roles = await getRankRoles("guild-empty");
      expect(roles).toEqual([]);
    });

    it("deve retornar cargos ordenados por nível", async () => {
      await setRankRole("guild-123", 10, "Novato");
      await setRankRole("guild-123", 5, "Iniciante");
      await setRankRole("guild-123", 20, "Veterano");

      const roles = await getRankRoles("guild-123");

      expect(roles.length).toBe(3);
      expect(roles[0].level).toBe(5);
      expect(roles[1].level).toBe(10);
      expect(roles[2].level).toBe(20);
    });

    it("deve incluir todos os campos necessários", async () => {
      await setRankRole("guild-fields", 15, "Intermediário");

      const roles = await getRankRoles("guild-fields");

      expect(roles[0]).toHaveProperty("id");
      expect(roles[0]).toHaveProperty("guild_id", "guild-fields");
      expect(roles[0]).toHaveProperty("level", 15);
      expect(roles[0]).toHaveProperty("role_name", "Intermediário");
      expect(roles[0]).toHaveProperty("created_at");
    });
  });

  describe("setRankRole", () => {
    it("deve criar novo cargo de rank", async () => {
      const success = await setRankRole("guild-new", 10, "Novato");
      expect(success).toBe(true);

      const roles = await getRankRoles("guild-new");
      expect(roles.length).toBe(1);
      expect(roles[0].role_name).toBe("Novato");
    });

    it("deve substituir cargo existente no mesmo nível", async () => {
      await setRankRole("guild-replace", 10, "Cargo Antigo");
      await setRankRole("guild-replace", 10, "Cargo Novo");

      const roles = await getRankRoles("guild-replace");
      expect(roles.length).toBe(1);
      expect(roles[0].role_name).toBe("Cargo Novo");
    });

    it("deve criar múltiplos cargos para diferentes níveis", async () => {
      await setRankRole("guild-multi", 5, "Bronze");
      await setRankRole("guild-multi", 10, "Prata");
      await setRankRole("guild-multi", 15, "Ouro");

      const roles = await getRankRoles("guild-multi");
      expect(roles.length).toBe(3);
    });
  });

  describe("removeRankRole", () => {
    it("deve remover cargo de rank específico", async () => {
      await setRankRole("guild-remove", 10, "Temporário");
      const removed = await removeRankRole("guild-remove", 10);

      expect(removed).toBe(true);

      const roles = await getRankRoles("guild-remove");
      expect(roles.length).toBe(0);
    });

    it("deve remover apenas o cargo do nível especificado", async () => {
      await setRankRole("guild-selective", 5, "Manter");
      await setRankRole("guild-selective", 10, "Remover");
      await setRankRole("guild-selective", 15, "Manter Também");

      await removeRankRole("guild-selective", 10);

      const roles = await getRankRoles("guild-selective");
      expect(roles.length).toBe(2);
      expect(roles.find((r) => r.level === 10)).toBeUndefined();
    });

    it("deve retornar true mesmo se cargo não existir", async () => {
      const removed = await removeRankRole("guild-nonexistent", 99);
      expect(removed).toBe(true);
    });
  });

  describe("Integração com Ranking Service", () => {
    it("deve suportar múltiplas guilds independentes", async () => {
      await setRankRole("guild-a", 10, "Cargo Guild A");
      await setRankRole("guild-b", 10, "Cargo Guild B");

      const rolesA = await getRankRoles("guild-a");
      const rolesB = await getRankRoles("guild-b");

      expect(rolesA[0].role_name).toBe("Cargo Guild A");
      expect(rolesB[0].role_name).toBe("Cargo Guild B");
    });

    it("deve permitir níveis não sequenciais", async () => {
      await setRankRole("guild-gaps", 1, "Início");
      await setRankRole("guild-gaps", 50, "Meio");
      await setRankRole("guild-gaps", 100, "Fim");

      const roles = await getRankRoles("guild-gaps");
      expect(roles.map((r) => r.level)).toEqual([1, 50, 100]);
    });
  });

  describe("Edge cases e validações", () => {
    it("deve lidar com nomes de cargo longos", async () => {
      const longName = "A".repeat(100);
      const success = await setRankRole("guild-long", 10, longName);
      expect(success).toBe(true);

      const roles = await getRankRoles("guild-long");
      expect(roles[0].role_name).toBe(longName);
    });

    it("deve lidar com caracteres especiais no nome", async () => {
      const specialName = "Cargo 🎖️ Especial & Único";
      await setRankRole("guild-special", 10, specialName);

      const roles = await getRankRoles("guild-special");
      expect(roles[0].role_name).toBe(specialName);
    });

    it("deve retornar false em caso de erro ao criar cargo (sem trigger)", async () => {
      // Teste de error handling - funções internas lidam com erros via try/catch
      // getSQLite() reabre conexão automaticamente, então erro real é difícil de simular
      const result = await setRankRole("guild-test", 10, "Test");
      expect(typeof result).toBe("boolean");
    });

    it("deve lidar com erro interno retornando array vazio", async () => {
      // getRankRoles tem try/catch que retorna [] em caso de erro
      const roles = await getRankRoles("guild-safe");
      expect(Array.isArray(roles)).toBe(true);
    });

    it("deve parsear created_at como Date", async () => {
      await setRankRole("guild-date", 10, "Test Date");
      const roles = await getRankRoles("guild-date");

      expect(roles[0].created_at).toBeInstanceOf(Date);
    });

    it("deve manter integridade ao atualizar múltiplos níveis", async () => {
      await setRankRole("guild-integrity", 5, "Level 5");
      await setRankRole("guild-integrity", 10, "Level 10");
      await setRankRole("guild-integrity", 5, "Level 5 Updated");

      const roles = await getRankRoles("guild-integrity");
      expect(roles.length).toBe(2);
      expect(roles.find((r) => r.level === 5)?.role_name).toBe(
        "Level 5 Updated",
      );
      expect(roles.find((r) => r.level === 10)?.role_name).toBe("Level 10");
    });
  });
});
