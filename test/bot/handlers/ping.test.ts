import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { handlePing } from "@/bot/handlers/ping.js";

describe("Ping Handler", () => {
  let mockInteraction: Partial<ChatInputCommandInteraction>;

  beforeEach(() => {
    mockInteraction = {
      reply: vi.fn().mockResolvedValue({}),
    };
  });

  it("deve responder com Pong!", async () => {
    await handlePing(mockInteraction as ChatInputCommandInteraction);

    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: "Pong!",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("deve lidar com erro na resposta", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockInteraction.reply = vi
      .fn()
      .mockRejectedValue(new Error("Discord API error"));

    await handlePing(mockInteraction as ChatInputCommandInteraction);

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
