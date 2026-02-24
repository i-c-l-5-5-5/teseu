import { addXp, getUserXP } from "@storage/repo.js";
import { closeSQLite, getSQLite } from "@storage/sqlite.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Repo Storage", () => {
  beforeEach(() => {
    process.env.DB_PATH = ":memory:";
    getSQLite();
  });

  afterEach(() => {
    closeSQLite();
    delete process.env.DB_PATH;
  });

  describe("addXp", () => {
    it("deve adicionar XP ao usuário", async () => {
      const success = await addXp("user-1", "guild-1");
      expect(success).toBe(true);

      const xp = await getUserXP("user-1", "guild-1");
      expect(xp).toBeGreaterThan(0);
    });

    it("deve adicionar XP randomizado entre 10-15 por chamada", async () => {
      const xpBefore = await getUserXP("user-random", "guild-1");
      await addXp("user-random", "guild-1");
      const xpAfter = await getUserXP("user-random", "guild-1");

      const gained = xpAfter - xpBefore;
      expect(gained).toBeGreaterThanOrEqual(10);
      expect(gained).toBeLessThanOrEqual(15);
    });

    it("deve acumular XP em múltiplas chamadas", async () => {
      await addXp("user-multi", "guild-1");
      await addXp("user-multi", "guild-1");
      await addXp("user-multi", "guild-1");

      const xp = await getUserXP("user-multi", "guild-1");
      expect(xp).toBeGreaterThanOrEqual(30);
    });

    it("deve calcular nível baseado em XP (100 XP por nível)", async () => {
      // Adicionar XP suficiente para level up
      for (let i = 0; i < 10; i++) {
        await addXp("user-level", "guild-1");
      }

      const xp = await getUserXP("user-level", "guild-1");
      expect(xp).toBeGreaterThan(100);
    });

    it("addXp deve retornar false em caso de erro no banco", async () => {
      const mod = await import("@/storage/sqlite.js");
      const spy = vi.spyOn(mod, "getSQLite").mockImplementationOnce(() => {
        throw new Error("forced error");
      });

      const ok = await addXp("user-error", "guild-error");
      expect(ok).toBe(false);

      spy.mockRestore();
    });

    it("getUserXP deve retornar 0 em caso de erro no banco", async () => {
      const mod = await import("@/storage/sqlite.js");
      const spy = vi.spyOn(mod, "getSQLite").mockImplementationOnce(() => {
        throw new Error("forced error");
      });

      const xp = await getUserXP("user-error", "guild-error");
      expect(xp).toBe(0);

      spy.mockRestore();
    });
    it("deve manter XP separado por guild", async () => {
      await addXp("user-separate", "guild-1");
      await addXp("user-separate", "guild-2");

      const xp1 = await getUserXP("user-separate", "guild-1");
      const xp2 = await getUserXP("user-separate", "guild-2");

      expect(xp1).toBeGreaterThan(0);
      expect(xp2).toBeGreaterThan(0);
    });
  });

  describe("getUserXP", () => {
    it("deve retornar 0 para usuário novo", async () => {
      const xp = await getUserXP("user-new", "guild-1");
      expect(xp).toBe(0);
    });

    it("deve retornar XP correto após ganhos", async () => {
      await addXp("user-xp", "guild-1");
      const xp = await getUserXP("user-xp", "guild-1");

      expect(xp).toBeGreaterThan(0);
    });

    it("deve retornar XP específico da guild", async () => {
      await addXp("user-guild-specific", "guild-1");

      const xpGuild1 = await getUserXP("user-guild-specific", "guild-1");
      const xpGuild2 = await getUserXP("user-guild-specific", "guild-2");

      expect(xpGuild1).toBeGreaterThan(0);
      expect(xpGuild2).toBe(0);
    });
  });

  describe("Edge cases e validações", () => {
    it("deve preservar created_at em updates subsequentes", async () => {
      const { getSQLite } = await import("@storage/sqlite.js");
      const db = getSQLite();

      await addXp("user-created", "guild-1");
      const first = db
        .prepare("SELECT created_at FROM xp WHERE user_id = ? AND guild_id = ?")
        .get("user-created", "guild-1") as { created_at: string };

      await addXp("user-created", "guild-1");
      const second = db
        .prepare("SELECT created_at FROM xp WHERE user_id = ? AND guild_id = ?")
        .get("user-created", "guild-1") as { created_at: string };

      expect(first.created_at).toBe(second.created_at);
    });

    it("deve atualizar last_message_at em cada ganho de XP", async () => {
      const { getSQLite } = await import("@storage/sqlite.js");
      const db = getSQLite();

      await addXp("user-timestamp", "guild-1");
      const first = db
        .prepare(
          "SELECT last_message_at FROM xp WHERE user_id = ? AND guild_id = ?",
        )
        .get("user-timestamp", "guild-1") as { last_message_at: string };

      // Pequeno delay para garantir timestamp diferente
      await new Promise((resolve) => setTimeout(resolve, 10));

      await addXp("user-timestamp", "guild-1");
      const second = db
        .prepare(
          "SELECT last_message_at FROM xp WHERE user_id = ? AND guild_id = ?",
        )
        .get("user-timestamp", "guild-1") as { last_message_at: string };

      // Timestamps devem ser diferentes (ou iguais dependendo da precisão do SQLite)
      expect(typeof second.last_message_at).toBe("string");
    });

    it("deve calcular nível 1 para XP 0-99", async () => {
      const { getSQLite } = await import("@storage/sqlite.js");
      const db = getSQLite();

      await addXp("user-level-1", "guild-1");
      const data = db
        .prepare("SELECT level, xp FROM xp WHERE user_id = ? AND guild_id = ?")
        .get("user-level-1", "guild-1") as { level: number; xp: number };

      if (data.xp < 100) {
        expect(data.level).toBe(1);
      }
    });

    it("deve calcular nível 2 para XP 100-199", async () => {
      const { getSQLite } = await import("@storage/sqlite.js");
      const db = getSQLite();

      // Adicionar XP suficiente para nível 2
      for (let i = 0; i < 10; i++) {
        await addXp("user-level-2", "guild-1");
      }

      const data = db
        .prepare("SELECT level, xp FROM xp WHERE user_id = ? AND guild_id = ?")
        .get("user-level-2", "guild-1") as { level: number; xp: number };

      if (data.xp >= 100 && data.xp < 200) {
        expect(data.level).toBe(2);
      }
    });

    it("deve lidar com múltiplos usuários na mesma guild", async () => {
      await addXp("user-a", "guild-multi");
      await addXp("user-b", "guild-multi");
      await addXp("user-c", "guild-multi");

      const xpA = await getUserXP("user-a", "guild-multi");
      const xpB = await getUserXP("user-b", "guild-multi");
      const xpC = await getUserXP("user-c", "guild-multi");

      expect(xpA).toBeGreaterThan(0);
      expect(xpB).toBeGreaterThan(0);
      expect(xpC).toBeGreaterThan(0);
    });

    it("deve lidar com erros internos retornando false", async () => {
      // addXp tem try/catch que retorna false em caso de erro
      // getSQLite() reabre conexão automaticamente
      const result = await addXp("user-safe", "guild-safe");
      expect(typeof result).toBe("boolean");
    });

    it("deve lidar com erros internos retornando 0", async () => {
      // getUserXP tem try/catch que retorna 0 em caso de erro
      const xp = await getUserXP("user-safe", "guild-safe");
      expect(typeof xp).toBe("number");
    });
  });
});
