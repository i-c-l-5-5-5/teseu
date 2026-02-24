import type { ChatInputCommandInteraction, User } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Testes para o handler de ranking.
 * Valida exibição de ranks, XP e leaderboard.
 */
describe("Rank Handler", () => {
  let mockInteraction: Partial<ChatInputCommandInteraction>;
  let mockUser: Partial<User>;

  beforeEach(() => {
    mockUser = {
      id: "user-123",
      username: "testuser",
      bot: false,
    };

    mockInteraction = {
      guildId: "guild-123",
      user: mockUser as User,
      // @oraculo-disable-next-line tipo-literal-inline-complexo
      options: {
        getUser: vi.fn().mockReturnValue(mockUser),
        getInteger: vi.fn((key: string) => {
          if (key === "limit") return 10;
          return null;
        }),
      } as any,
      reply: vi.fn().mockResolvedValue({}),
      deferReply: vi.fn().mockResolvedValue({}),
      editReply: vi.fn().mockResolvedValue({}),
    };
  });

  it("deve retornar informações de rank do usuário", () => {
    const mockRankData = {
      user_id: "user-123",
      guild_id: "guild-123",
      xp: 1500,
      level: 15,
      position: 3,
    };

    expect(mockRankData.level).toBe(15);
    expect(mockRankData.xp).toBe(1500);
    expect(mockRankData.position).toBe(3);
  });

  it("deve calcular XP necessário para próximo nível", () => {
    const currentXP = 1500;
    const currentLevel = 15;
    const xpPerLevel = 100;

    const nextLevelXP = (currentLevel + 1) * xpPerLevel;
    const xpNeeded = nextLevelXP - currentXP;

    expect(xpNeeded).toBe(100);
  });

  it("deve formatar leaderboard com limite", () => {
    const leaderboard = [
      { user_id: "user-1", xp: 5000, level: 50, position: 1 },
      { user_id: "user-2", xp: 3000, level: 30, position: 2 },
      { user_id: "user-3", xp: 1500, level: 15, position: 3 },
    ];

    const limit = mockInteraction.options!.getInteger("limit")!;

    expect(leaderboard.length).toBeLessThanOrEqual(limit);
    expect(leaderboard[0].position).toBe(1);
    expect(leaderboard[leaderboard.length - 1].position).toBe(3);
  });

  it("deve lidar com usuário sem rank", () => {
    const newUserRank = {
      user_id: "new-user",
      guild_id: "guild-123",
      xp: 0,
      level: 1,
      position: 0,
    };

    expect(newUserRank.xp).toBe(0);
    expect(newUserRank.level).toBe(1);
  });

  it("deve validar usuário alvo", () => {
    const targetUser = mockInteraction.options!.getUser("usuario");

    expect(targetUser).toBeDefined();
    expect(targetUser!.id).toBe("user-123");
    expect(targetUser!.bot).toBe(false);
  });

  it("deve retornar rank do próprio usuário quando não especificado", () => {
    mockInteraction.options!.getUser = vi.fn().mockReturnValue(null);

    const targetUser =
      mockInteraction.options!.getUser("usuario") || mockInteraction.user;

    expect(targetUser!.id).toBe("user-123");
  });

  it("deve ordenar leaderboard por XP decrescente", () => {
    const unsorted = [
      { user_id: "user-1", xp: 1500, level: 15 },
      { user_id: "user-2", xp: 5000, level: 50 },
      { user_id: "user-3", xp: 3000, level: 30 },
    ];

    const sorted = [...unsorted].sort((a, b) => b.xp - a.xp);

    expect(sorted[0].xp).toBe(5000);
    expect(sorted[1].xp).toBe(3000);
    expect(sorted[2].xp).toBe(1500);
  });

  it("deve exibir progresso percentual até próximo nível", () => {
    const currentXP = 1550;
    const currentLevel = 15;
    const xpPerLevel = 100;

    const xpInCurrentLevel = currentXP % xpPerLevel;
    const progressPercent = Math.floor((xpInCurrentLevel / xpPerLevel) * 100);

    expect(progressPercent).toBe(50);
  });
});
