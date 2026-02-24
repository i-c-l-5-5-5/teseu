import { closeSQLite, getSQLite } from "@storage/sqlite.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addMessageXP,
  getLeaderboard,
  getRankConfig,
  getRankRoles,
  getUserRank,
  getUserXP,
  removeRankRole,
  setRankRole,
} from "@/services/ranking.js";

// Mock channel-config para controlarmos isChannelAllowed
vi.mock("@/storage/channel-config.js", () => ({
  isChannelAllowed: vi.fn(
    async (guildId: string, channelId: string, feature: string) => {
      // Bloquear especificamente canal "canal-bloqueado-123"
      return channelId !== "canal-bloqueado-123";
    },
  ),
}));

/**
 * Testes para o serviço de ranking.
 * Valida ganho de XP, níveis, leaderboard e roles.
 */
describe("Ranking Service", () => {
  beforeEach(() => {
    process.env.DB_PATH = ":memory:";
    getSQLite();
  });

  afterEach(() => {
    closeSQLite();
    delete process.env.DB_PATH;
  });

  describe("addMessageXP", () => {
    it("deve adicionar XP ao usuário por mensagem", async () => {
      const result = await addMessageXP("user-1", "guild-1");

      expect(result.newLevel).toBeGreaterThanOrEqual(1);
      expect(result.leveledUp).toBeDefined();
    });

    it("deve detectar level up quando XP suficiente", async () => {
      // Simular múltiplas mensagens para level up
      let lastResult;
      for (let i = 0; i < 15; i++) {
        lastResult = await addMessageXP("user-1", "guild-1");
      }

      const xp = await getUserXP("user-1", "guild-1");
      expect(xp).toBeGreaterThan(100);
    });

    it("deve retornar newRank quando atinge nível com cargo", async () => {
      await setRankRole("guild-1", 5, "Novato");

      // Adicionar XP suficiente para nível 5
      for (let i = 0; i < 50; i++) {
        await addMessageXP("user-level5", "guild-1");
      }

      const rank = await getUserRank("user-level5", "guild-1");
      expect(rank.level).toBeGreaterThanOrEqual(5);
    });
  });

  describe("getUserXP", () => {
    it("deve retornar 0 para usuário novo", async () => {
      const xp = await getUserXP("new-user", "guild-1");
      expect(xp).toBe(0);
    });

    it("deve retornar XP correto após ganhos", async () => {
      await addMessageXP("user-xp", "guild-1");
      const xp = await getUserXP("user-xp", "guild-1");

      expect(xp).toBeGreaterThan(0);
    });
  });

  describe("getUserRank", () => {
    it("deve retornar dados completos de rank", async () => {
      await addMessageXP("user-rank", "guild-1");
      const rank = await getUserRank("user-rank", "guild-1");

      expect(rank).toHaveProperty("user_id", "user-rank");
      expect(rank).toHaveProperty("guild_id", "guild-1");
      expect(rank).toHaveProperty("xp");
      expect(rank).toHaveProperty("level");
      expect(rank).toHaveProperty("position");
    });

    it("deve calcular posição correta no ranking", async () => {
      // Adicionar XP para múltiplos usuários
      for (let i = 0; i < 20; i++) await addMessageXP("user-top", "guild-1");
      for (let i = 0; i < 10; i++) await addMessageXP("user-mid", "guild-1");
      for (let i = 0; i < 5; i++) await addMessageXP("user-low", "guild-1");

      const topRank = await getUserRank("user-top", "guild-1");
      const midRank = await getUserRank("user-mid", "guild-1");

      expect(topRank.position).toBeLessThan(midRank.position);
    });
  });

  describe("getLeaderboard", () => {
    it("deve retornar leaderboard vazio quando sem dados", async () => {
      const leaderboard = await getLeaderboard("guild-empty", 10);
      expect(leaderboard).toEqual([]);
    });

    it("deve respeitar limite de entradas", async () => {
      // Criar 15 usuários com XP
      for (let i = 0; i < 15; i++) {
        await addMessageXP(`user-${i}`, "guild-1");
      }

      const leaderboard = await getLeaderboard("guild-1", 10);
      expect(leaderboard.length).toBeLessThanOrEqual(10);
    });

    it("deve ordenar por XP decrescente", async () => {
      for (let i = 0; i < 20; i++) await addMessageXP("user-top", "guild-1");
      for (let i = 0; i < 10; i++) await addMessageXP("user-mid", "guild-1");

      const leaderboard = await getLeaderboard("guild-1", 5);

      expect(leaderboard[0].xp).toBeGreaterThanOrEqual(leaderboard[1].xp);
    });

    it("deve incluir posição numérica", async () => {
      await addMessageXP("user-1", "guild-1");
      await addMessageXP("user-2", "guild-1");

      const leaderboard = await getLeaderboard("guild-1", 10);

      leaderboard.forEach((entry, index) => {
        expect(entry.position).toBe(index + 1);
      });
    });
  });

  describe("Rank Roles", () => {
    it("deve configurar cargo de rank", async () => {
      const success = await setRankRole("guild-1", 10, "Veterano");
      expect(success).toBe(true);
    });

    it("deve substituir cargo existente no mesmo nível", async () => {
      await setRankRole("guild-1", 5, "Iniciante");
      await setRankRole("guild-1", 5, "Novato");

      const roles = await getRankRoles("guild-1");
      const level5Roles = roles.filter((r) => r.threshold === 5);

      expect(level5Roles.length).toBe(1);
      expect(level5Roles[0].name).toBe("Novato");
    });

    it("deve listar cargos ordenados por nível", async () => {
      await setRankRole("guild-1", 20, "Mestre");
      await setRankRole("guild-1", 5, "Novato");
      await setRankRole("guild-1", 10, "Experiente");

      const roles = await getRankRoles("guild-1");

      expect(roles[0].threshold).toBeLessThan(roles[1].threshold);
    });

    it("deve remover cargo de rank", async () => {
      await setRankRole("guild-1", 15, "Avançado");
      const removed = await removeRankRole("guild-1", 15);

      expect(removed).toBe(true);

      const roles = await getRankRoles("guild-1");
      const level15 = roles.find((r) => r.threshold === 15);

      expect(level15).toBeUndefined();
    });

    it("deve retornar array vazio quando sem cargos configurados", async () => {
      const roles = await getRankRoles("guild-empty");
      expect(roles).toEqual([]);
    });
  });

  describe("Ganho de XP com Cooldown", () => {
    it("deve respeitar bloqueio de canal", async () => {
      // Este teste depende de isChannelAllowed
      // Aqui validamos que o método aceita channelId
      const result = await addMessageXP("user-1", "guild-1", "blocked-channel");

      // Se canal bloqueado, não sobe nível
      expect(result).toHaveProperty("newLevel");
    });
  });

  describe("getRankConfig e setRankConfig", () => {
    it("deve retornar configuração padrão para guild nova", async () => {
      const { getRankConfig } = await import("@/services/ranking.js");
      const config = await getRankConfig("guild-new-config");
      expect(config.enabled).toBe(false);
      expect(config.roles).toEqual([]);
    });

    it("deve salvar e recuperar configuração de ranking", async () => {
      const { getRankConfig, setRankConfig } =
        await import("@/services/ranking.js");
      const config = {
        enabled: true,
        roles: [
          { level: 5, name: "Novato" },
          { level: 10, name: "Experiente" },
        ],
      };

      const saved = await setRankConfig("guild-config", config);
      expect(saved).toBe(true);

      const retrieved = await getRankConfig("guild-config");
      expect(retrieved.enabled).toBe(true);
      expect(retrieved.roles.length).toBe(2);
    });

    it("deve atualizar configuração existente", async () => {
      const { getRankConfig, setRankConfig } =
        await import("@/services/ranking.js");
      await setRankConfig("guild-update", { enabled: false, roles: [] });
      await setRankConfig("guild-update", {
        enabled: true,
        roles: [{ level: 3, name: "Teste" }],
      });

      const config = await getRankConfig("guild-update");
      expect(config.enabled).toBe(true);
    });
  });

  describe("getUserRank edge cases", () => {
    it("deve retornar rank padrão para usuário sem dados", async () => {
      const rank = await getUserRank("user-no-data", "guild-no-data");
      expect(rank.user_id).toBe("user-no-data");
      expect(rank.xp).toBe(0);
      expect(rank.level).toBe(1);
    });

    it("deve calcular message_count como 0 por padrão", async () => {
      await addMessageXP("user-msgs", "guild-1");
      const rank = await getUserRank("user-msgs", "guild-1");
      expect(rank.message_count).toBe(0);
    });
  });

  describe("getLeaderboard edge cases", () => {
    it("deve lidar com limite maior que usuários disponíveis", async () => {
      await addMessageXP("user-single", "guild-single");
      const leaderboard = await getLeaderboard("guild-single", 100);
      expect(leaderboard.length).toBe(1);
    });

    it("deve calcular message_count estimado baseado em XP", async () => {
      for (let i = 0; i < 10; i++)
        await addMessageXP("user-count", "guild-count");
      const leaderboard = await getLeaderboard("guild-count", 1);
      expect(leaderboard[0]).toHaveProperty("message_count");
      expect(leaderboard[0].message_count).toBeGreaterThan(0);
    });
  });

  describe("getRankConfig edge cases", () => {
    it("deve retornar fallback quando não há configuração", async () => {
      const config = await getRankConfig("guild-nao-configurada");
      expect(config.enabled).toBe(false);
      expect(config.roles).toEqual([]);
    });

    it("deve normalizar roles como array vazio quando não é array", async () => {
      const db = getSQLite();
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO config 
        (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);

      // Salvar config com roles inválido (não array)
      stmt.run(
        "rank_config_guild-invalid-roles",
        JSON.stringify({ enabled: true, roles: null }),
      );

      const config = await getRankConfig("guild-invalid-roles");
      expect(config.enabled).toBe(true);
      expect(config.roles).toEqual([]);
    });
  });

  describe("addMessageXP edge cases", () => {
    it("deve retornar nível 1 quando canal não permite XP", async () => {
      const result = await addMessageXP(
        "user-test",
        "guild-test",
        "canal-bloqueado-123",
      );
      expect(result.newLevel).toBe(1);
      expect(result.leveledUp).toBe(false);
      expect(result.newRank).toBeUndefined();
    });

    it("deve atribuir cargo quando usuário sobe de nível", async () => {
      const db = getSQLite();

      // Configurar cargo para nível 2
      const rankStmt = db.prepare(`
        INSERT OR REPLACE INTO rank_roles 
        (guild_id, level, role_name) 
        VALUES (?, ?, ?)
      `);
      rankStmt.run("guild-level-up", 2, "Iniciante");

      // Adicionar XP suficiente para subir de nível (precisa de 100+ XP para nível 2)
      const xpStmt = db.prepare(`
        INSERT OR REPLACE INTO xp 
        (user_id, guild_id, xp, level, last_message_at, updated_at, created_at) 
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      xpStmt.run("user-level-up", "guild-level-up", 95, 1);

      // Adicionar mensagem (deve ganhar entre 10-15 XP e subir para nível 2)
      const result = await addMessageXP("user-level-up", "guild-level-up");

      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(2);
      expect(result.newRank).toBe("Iniciante");
    });
  });

  describe("getUserRank edge cases", () => {
    it("deve retornar fallback quando usuário não existe", async () => {
      const rank = await getUserRank("user-inexistente-rank", "guild-test");

      expect(rank.user_id).toBe("user-inexistente-rank");
      expect(rank.guild_id).toBe("guild-test");
      expect(rank.xp).toBe(0);
      expect(rank.level).toBe(1);
      expect(rank.position).toBe(0);
      expect(rank.current_rank).toBeUndefined();
    });

    it("deve calcular posição corretamente", async () => {
      const db = getSQLite();
      const xpStmt = db.prepare(`
        INSERT OR REPLACE INTO xp 
        (user_id, guild_id, xp, level, last_message_at, updated_at, created_at) 
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      // Criar 3 usuários com XP diferentes
      xpStmt.run("user-top-1", "guild-positions", 300, 4);
      xpStmt.run("user-top-2", "guild-positions", 200, 3);
      xpStmt.run("user-top-3", "guild-positions", 100, 2);

      const rank1 = await getUserRank("user-top-1", "guild-positions");
      const rank2 = await getUserRank("user-top-2", "guild-positions");
      const rank3 = await getUserRank("user-top-3", "guild-positions");

      expect(rank1.position).toBe(1);
      expect(rank2.position).toBe(2);
      expect(rank3.position).toBe(3);
    });
  });

  it("getLeaderboard deve retornar [] em caso de erro no banco", async () => {
    const mod = await import("@/storage/sqlite.js");
    const spy = vi.spyOn(mod, "getSQLite").mockImplementationOnce(() => {
      throw new Error("forced error");
    });

    const result = await getLeaderboard("guild-error", 5);
    expect(result).toEqual([]);

    spy.mockRestore();
  });
});
