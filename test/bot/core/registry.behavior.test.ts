/*
SPDX-License-Identifier: MIT
*/
import { botRegistry } from "@bot/core/registry.js";
import { PermissionFlagsBits } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

function createInteractionMock(opts?: {
  admin?: boolean;
  userId?: string;
  guildId?: string;
  replied?: boolean;
  deferred?: boolean;
}) {
  const calls: Array<{ reply?: any; editReply?: any }> = [];
  const interaction: any = {
    user: { id: opts?.userId ?? "user-1", username: "tester" },
    guildId: opts?.guildId ?? "guild-1",
    replied: !!opts?.replied,
    deferred: !!opts?.deferred,
    memberPermissions: {
      has: (bit: bigint) =>
        opts?.admin ? bit === PermissionFlagsBits.Administrator : false,
    },
    reply: vi.fn(async (payload: any) => {
      calls.push({ reply: payload });
      interaction.replied = true;
    }),
    editReply: vi.fn(async (payload: any) => {
      calls.push({ editReply: payload });
    }),
  };
  return { interaction, calls } as const;
}

function createButtonInteractionMock(
  customId: string,
  opts?: { replied?: boolean; deferred?: boolean },
) {
  const calls: Array<{ reply?: any; editReply?: any }> = [];
  const interaction: any = {
    customId,
    replied: !!opts?.replied,
    deferred: !!opts?.deferred,
    reply: vi.fn(async (payload: any) => {
      calls.push({ reply: payload });
      interaction.replied = true;
    }),
    editReply: vi.fn(async (payload: any) => {
      calls.push({ editReply: payload });
    }),
  };
  return { interaction, calls } as const;
}

describe("BotRegistry behavior", () => {
  const registry = botRegistry;

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    registry.commands.clear();
    registry.components.clear();
    registry.events.clear();
    registry.clearCooldowns();
  });

  it("executeCommand: responde quando comando não existe", async () => {
    const { interaction } = createInteractionMock();
    await registry.executeCommand("inexistente", interaction);
    expect(interaction.reply).toHaveBeenCalled();
    expect(interaction.reply.mock.calls[0][0].content).toMatch(
      /Comando não encontrado/,
    );
  });

  it("executeCommand: bloqueia adminOnly para não-admin e permite para admin", async () => {
    const handler = { name: "admin-only", adminOnly: true, execute: vi.fn() };
    registry.register({ data: { name: "admin-only" }, handler } as any);

    const nonAdmin = createInteractionMock({ admin: false });
    await registry.executeCommand("admin-only", nonAdmin.interaction);
    expect(nonAdmin.interaction.reply).toHaveBeenCalled();
    expect(handler.execute).not.toHaveBeenCalled();

    const admin = createInteractionMock({ admin: true });
    await registry.executeCommand("admin-only", admin.interaction);
    expect(handler.execute).toHaveBeenCalledTimes(1);
  });

  it("executeCommand: aplica cooldown e informa tempo restante", async () => {
    const handler = { name: "cool", cooldown: 1, execute: vi.fn() };
    registry.register({ data: { name: "cool" }, handler } as any);

    const { interaction } = createInteractionMock({ userId: "u1" });
    await registry.executeCommand("cool", interaction);
    expect(handler.execute).toHaveBeenCalledTimes(1);

    const { interaction: again } = createInteractionMock({ userId: "u1" });
    await registry.executeCommand("cool", again);
    expect(again.reply).toHaveBeenCalled();
    const msg = again.reply.mock.calls[0][0].content as string;
    expect(msg).toMatch(/Aguarde/);
  });

  it("executeCommand: captura erro e responde via reply quando não respondeu ainda", async () => {
    const handler = {
      name: "err",
      execute: vi.fn().mockRejectedValue(new Error("boom")),
    };
    registry.register({ data: { name: "err" }, handler } as any);

    const { interaction } = createInteractionMock({ replied: false });
    await registry.executeCommand("err", interaction);
    expect(interaction.reply).toHaveBeenCalled();
    expect(interaction.reply.mock.calls[0][0].content).toMatch(
      /Erro ao executar comando/,
    );
  });

  it("executeCommand: captura erro e responde via editReply quando já respondeu", async () => {
    const handler = {
      name: "err2",
      execute: vi.fn().mockRejectedValue(new Error("boom")),
    };
    registry.register({ data: { name: "err2" }, handler } as any);

    const { interaction } = createInteractionMock({ replied: true });
    await registry.executeCommand("err2", interaction);
    expect(interaction.editReply).toHaveBeenCalled();
  });

  it("executeComponent: match exato e regex", async () => {
    const compExact = {
      customId: "btn:save",
      type: "button",
      execute: vi.fn(),
    };
    const compRegex = {
      customId: /^quiz:.+$/,
      type: "button",
      execute: vi.fn(),
    };
    registry.register(compExact as any);
    registry.register(compRegex as any);

    const exact = createButtonInteractionMock("btn:save");
    await registry.executeComponent(exact.interaction);
    expect(compExact.execute).toHaveBeenCalled();

    const regex = createButtonInteractionMock("quiz:123");
    await registry.executeComponent(regex.interaction);
    expect(compRegex.execute).toHaveBeenCalled();
  });

  it("executeComponent: captura erro e usa editReply quando já respondeu", async () => {
    const comp = {
      customId: "btn:err",
      type: "button",
      execute: vi.fn().mockRejectedValue(new Error("x")),
    };
    registry.register(comp as any);
    const { interaction } = createButtonInteractionMock("btn:err", {
      replied: true,
      deferred: true,
    });
    await registry.executeComponent(interaction);
    expect(interaction.editReply).toHaveBeenCalled();
  });

  it("executeComponent: responde reply quando ainda não respondeu", async () => {
    const comp = {
      customId: "btn:new",
      type: "button",
      execute: vi.fn().mockRejectedValue(new Error("y")),
    };
    registry.register(comp as any);
    const { interaction } = createButtonInteractionMock("btn:new", {
      replied: false,
      deferred: false,
    });
    await registry.executeComponent(interaction);
    expect(interaction.reply).toHaveBeenCalled();
  });

  it("registerEvents: registra on/once e executa handlers", async () => {
    const onceHandler = { name: "ready", once: true, execute: vi.fn() };
    const onHandler = { name: "messageCreate", execute: vi.fn() };
    registry.register(onceHandler as any);
    registry.register(onHandler as any);

    const captured: Record<string, Array<(...a: unknown[]) => void>> = {};
    const client: any = {
      once: vi.fn((event: string, fn: (...a: unknown[]) => void) => {
        (captured[event] ||= []).push(fn);
      }),
      on: vi.fn((event: string, fn: (...a: unknown[]) => void) => {
        (captured[event] ||= []).push(fn);
      }),
    };

    registry.registerEvents(client);
    expect(client.once).toHaveBeenCalledWith("ready", expect.any(Function));
    expect(client.on).toHaveBeenCalledWith(
      "messageCreate",
      expect.any(Function),
    );

    // Simular disparo
    captured.ready.forEach((fn) => fn());
    captured.messageCreate.forEach((fn) => fn({ content: "hi" }));

    expect(onceHandler.execute).toHaveBeenCalled();
    expect(onHandler.execute).toHaveBeenCalled();
  });

  it("unregister: remove command/component/event corretamente", () => {
    const handler = { name: "cmd1", execute: vi.fn() };
    const comp = { customId: "btn:1", type: "button", execute: vi.fn() };
    const evt = { name: "ready", execute: vi.fn() };

    registry.register({ data: { name: "cmd1" }, handler } as any);
    registry.register(comp as any);
    registry.register(evt as any);

    expect(registry.hasCommand("cmd1")).toBe(true);
    expect(registry.hasComponent("btn:1")).toBe(true);

    registry.unregister("cmd1", "command");
    registry.unregister("btn:1", "component");
    registry.unregister("ready", "event");

    expect(registry.hasCommand("cmd1")).toBe(false);
    expect(registry.hasComponent("btn:1")).toBe(false);
    // eventos não têm helper hasEvent; validar por stats
    expect(registry.getStats().events).toBe(0);
  });
});
