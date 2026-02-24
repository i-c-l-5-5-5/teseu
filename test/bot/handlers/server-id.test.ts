import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleServerId } from "@/bot/handlers/server-id.js";

describe("Server ID Handler", () => {
  let mockInteraction: Partial<ChatInputCommandInteraction>;

  beforeEach(() => {
    mockInteraction = {
      guildId: "guild-123",
      reply: vi.fn().mockResolvedValue({}),
      memberPermissions: {
        has: vi.fn().mockReturnValue(true),
      } as unknown,
    };
  });

  it("deve retornar server ID para administrador", async () => {
    await handleServerId(mockInteraction as ChatInputCommandInteraction);

    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: "Server ID: guild-123",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("deve negar acesso para não-administrador", async () => {
    mockInteraction.memberPermissions = {
      has: vi.fn().mockReturnValue(false),
    } as unknown;

    await handleServerId(mockInteraction as ChatInputCommandInteraction);

    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: "Apenas administradores.",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("deve lidar com erro", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockInteraction.reply = vi
      .fn()
      .mockRejectedValue(new Error("Discord error"));

    await handleServerId(mockInteraction as ChatInputCommandInteraction);

    // Erro é tratado internamente
    consoleErrorSpy.mockRestore();
  });
});
