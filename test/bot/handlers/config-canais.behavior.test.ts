import type { ChannelConfig } from "@barqueiro/types";
import { defaultChannelConfig } from "@barqueiro/types";
import type { ChatInputCommandInteraction, TextChannel } from "discord.js";
import { MessageFlags } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleConfigCanais } from "@/bot/handlers/config-canais.js";

// Estado in-memory para simular storage
let state: ChannelConfig;

// Mocks do storage com estado controlável por teste
vi.mock("@storage/channel-config.js", () => ({
  getChannelConfig: vi.fn(async (guildId: string) => {
    if (state?.guild_id !== guildId) return defaultChannelConfig(guildId);
    return state;
  }),
  setChannelConfig: vi.fn(async (config: ChannelConfig) => {
    state = { ...defaultChannelConfig(config.guild_id), ...state, ...config };
    return true;
  }),
  removeChannelConfig: vi.fn(
    async (guildId: string, feature: keyof ChannelConfig) => {
      if (state?.guild_id !== guildId) state = defaultChannelConfig(guildId);
      switch (feature) {
        case "embeds_channel":
        case "perfil_quiz_channel":
        case "squad_quiz_channel":
        case "admin_commands_channel":
        case "level_up_channel":
        case "rank_channel":
          (state as unknown)[feature] = undefined;
          break;
        case "xp_channels":
        case "xp_ignore_channels":
        case "bot_commands_channels":
          (state as unknown)[feature] = [];
          break;
      }
      return true;
    },
  ),
}));

function makeInteraction(): Partial<ChatInputCommandInteraction> {
  return {
    guildId: "guild-1",
    memberPermissions: { has: vi.fn().mockReturnValue(true) } as unknown,
    options: {
      getSubcommand: vi.fn(),
      getString: vi.fn(),
      getChannel: vi.fn(),
    } as unknown,
    reply: vi.fn().mockResolvedValue({}),
    editReply: vi.fn().mockResolvedValue({}),
    deferReply: vi.fn().mockResolvedValue({}),
  };
}

describe("config-canais handler (behavior)", () => {
  beforeEach(() => {
    state = defaultChannelConfig("guild-1");
    vi.clearAllMocks();
  });

  it("nega fora de servidor", async () => {
    const i = makeInteraction();
    i.guildId = null as unknown;
    i.options!.getSubcommand = vi.fn().mockReturnValue("listar");
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith({
      content: "❌ Este comando só pode ser usado em servidores.",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("nega para não-administrador", async () => {
    const i = makeInteraction();
    (i.memberPermissions as unknown).has = vi.fn().mockReturnValue(false);
    i.options!.getSubcommand = vi.fn().mockReturnValue("listar");
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith({
      content: "❌ Apenas administradores podem usar este comando.",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("listar: responde com embed e ephemeral", async () => {
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("listar");
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalled();
    const args = (i.reply as unknown).mock.calls[0][0];
    expect(args.embeds?.length).toBe(1);
    expect(
      args.ephemeral ?? args.flags === MessageFlags.Ephemeral,
    ).toBeTruthy();
  });

  it("definir: configura canal de embeds e confirma", async () => {
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("definir");
    i.options!.getString = vi.fn().mockReturnValue("embeds");
    i.options!.getChannel = vi
      .fn()
      .mockReturnValue({ id: "ch-embeds" } as TextChannel);
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalled();
    expect(state.embeds_channel).toBe("ch-embeds");
  });

  it("definir: falha ao salvar retorna erro", async () => {
    const i = makeInteraction();
    // Força setChannelConfig a falhar nesta chamada
    const storage = await import("@storage/channel-config.js");
    (storage.setChannelConfig as unknown).mockResolvedValueOnce(false);
    i.options!.getSubcommand = vi.fn().mockReturnValue("definir");
    i.options!.getString = vi.fn().mockReturnValue("rank");
    i.options!.getChannel = vi
      .fn()
      .mockReturnValue({ id: "ch-rank" } as TextChannel);
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Erro ao salvar"),
      }),
    );
  });

  it("xp add-allow: exige canal", async () => {
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("xp");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) => (k === "acao" ? "add-allow" : null));
    i.options!.getChannel = vi.fn().mockReturnValue(null);
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Canal é obrigatório"),
      }),
    );
  });

  it("xp add-allow: adiciona novo canal e evita duplicado", async () => {
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("xp");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) => (k === "acao" ? "add-allow" : null));
    i.options!.getChannel = vi
      .fn()
      .mockReturnValue({ id: "ch-xp" } as TextChannel);

    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(state.xp_channels).toEqual(["ch-xp"]);

    // chamada duplicada
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect((i.reply as unknown).mock.calls.pop()[0].content).toMatch(
      "já está na lista",
    );
  });

  it("xp add-ignore/remove-ignore", async () => {
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("xp");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) => (k === "acao" ? "add-ignore" : null));
    i.options!.getChannel = vi
      .fn()
      .mockReturnValue({ id: "ch-no-xp" } as TextChannel);

    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(state.xp_ignore_channels).toEqual(["ch-no-xp"]);

    // trocar para remove-ignore
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) =>
        k === "acao" ? "remove-ignore" : null,
      );
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(state.xp_ignore_channels).toEqual([]);
  });

  it("comandos: allow-all e restrict", async () => {
    const i = makeInteraction();
    // allow-all
    i.options!.getSubcommand = vi.fn().mockReturnValue("comandos");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) => (k === "acao" ? "allow-all" : null));
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(state.restrict_commands).toBe(false);
    expect(state.bot_commands_channels).toEqual([]);

    // restrict
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) => (k === "acao" ? "restrict" : null));
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(state.restrict_commands).toBe(true);
  });

  it("comandos: add-channel requer canal e evita duplicado", async () => {
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("comandos");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) => (k === "acao" ? "add-channel" : null));

    // sem canal
    i.options!.getChannel = vi.fn().mockReturnValue(null);
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Canal é obrigatório"),
      }),
    );

    // com canal
    i.options!.getChannel = vi
      .fn()
      .mockReturnValue({ id: "ch-cmd" } as TextChannel);
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(state.bot_commands_channels).toEqual(["ch-cmd"]);

    // duplicado
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect((i.reply as unknown).mock.calls.pop()[0].content).toMatch(
      "já está na lista",
    );
  });

  it("remover: funcionalidade específica (rank)", async () => {
    const i = makeInteraction();
    state.rank_channel = "ch-rank";
    i.options!.getSubcommand = vi.fn().mockReturnValue("remover");
    i.options!.getString = vi.fn().mockReturnValue("rank");
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(state.rank_channel).toBeUndefined();
  });

  it("remover: all falha ao salvar", async () => {
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("remover");
    i.options!.getString = vi.fn().mockReturnValue("all");

    const storage = await import("@storage/channel-config.js");
    (storage.setChannelConfig as unknown).mockResolvedValueOnce(false);

    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Erro ao remover"),
      }),
    );
  });

  it("captura erro geral e usa editReply se já deferido", async () => {
    const i = makeInteraction();
    (i as unknown).deferred = true;
    i.options!.getSubcommand = vi.fn().mockImplementation(() => {
      throw new Error("boom");
    });
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.editReply).toHaveBeenCalledWith(
      "❌ Erro ao processar configuração de canais.",
    );
  });

  it("definir: todas as funcionalidades", async () => {
    const funcionalidades = [
      { key: "perfil-quiz", field: "perfil_quiz_channel" as const },
      { key: "squad-quiz", field: "squad_quiz_channel" as const },
      { key: "admin-commands", field: "admin_commands_channel" as const },
      { key: "level-up", field: "level_up_channel" as const },
    ];

    for (const { key, field } of funcionalidades) {
      const i = makeInteraction();
      i.options!.getSubcommand = vi.fn().mockReturnValue("definir");
      i.options!.getString = vi.fn().mockReturnValue(key);
      i.options!.getChannel = vi
        .fn()
        .mockReturnValue({ id: `ch-${key}` } as TextChannel);
      await handleConfigCanais(i as ChatInputCommandInteraction);
      expect(state[field]).toBe(`ch-${key}`);
    }
  });

  it("xp remove-allow: remove canal", async () => {
    state.xp_channels = ["ch-xp"];
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("xp");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) =>
        k === "acao" ? "remove-allow" : null,
      );
    i.options!.getChannel = vi
      .fn()
      .mockReturnValue({ id: "ch-xp" } as TextChannel);
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(state.xp_channels).toEqual([]);
  });

  it("xp remove-allow: exige canal", async () => {
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("xp");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) =>
        k === "acao" ? "remove-allow" : null,
      );
    i.options!.getChannel = vi.fn().mockReturnValue(null);
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Canal é obrigatório"),
      }),
    );
  });

  it("xp remove-allow: sem configuração encontrada", async () => {
    state.xp_channels = undefined as unknown;
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("xp");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) =>
        k === "acao" ? "remove-allow" : null,
      );
    i.options!.getChannel = vi
      .fn()
      .mockReturnValue({ id: "ch-xp" } as TextChannel);
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Nenhuma configuração"),
      }),
    );
  });

  it("xp remove-ignore: sem configuração encontrada", async () => {
    state.xp_ignore_channels = undefined as unknown;
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("xp");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) =>
        k === "acao" ? "remove-ignore" : null,
      );
    i.options!.getChannel = vi
      .fn()
      .mockReturnValue({ id: "ch-no-xp" } as TextChannel);
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Nenhuma configuração"),
      }),
    );
  });

  it("xp list: lista configurações XP", async () => {
    state.xp_channels = ["ch-xp-1", "ch-xp-2"];
    state.xp_ignore_channels = ["ch-ignore-1"];
    const i = makeInteraction();

    // A ação "list" do xp não usa interface interativa, apenas reply direto
    i.options!.getSubcommand = vi.fn().mockReturnValue("xp");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) => (k === "acao" ? "list" : null));
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalled();
    const args = (i.reply as unknown).mock.calls[0][0];
    expect(args.embeds?.length).toBe(1);
  });
  it("xp add-ignore: exige canal", async () => {
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("xp");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) => (k === "acao" ? "add-ignore" : null));
    i.options!.getChannel = vi.fn().mockReturnValue(null);
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Canal é obrigatório"),
      }),
    );
  });

  it("xp add-ignore: evita duplicado", async () => {
    state.xp_ignore_channels = ["ch-ignore"];
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("xp");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) => (k === "acao" ? "add-ignore" : null));
    i.options!.getChannel = vi
      .fn()
      .mockReturnValue({ id: "ch-ignore" } as TextChannel);
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect((i.reply as unknown).mock.calls[0][0].content).toMatch(
      "já está na lista",
    );
  });

  it("xp remove-ignore: exige canal", async () => {
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("xp");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) =>
        k === "acao" ? "remove-ignore" : null,
      );
    i.options!.getChannel = vi.fn().mockReturnValue(null);
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Canal é obrigatório"),
      }),
    );
  });

  it("comandos remove-channel: remove canal e exige canal", async () => {
    state.bot_commands_channels = ["ch-cmd"];
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("comandos");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) =>
        k === "acao" ? "remove-channel" : null,
      );

    // sem canal
    i.options!.getChannel = vi.fn().mockReturnValue(null);
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Canal é obrigatório"),
      }),
    );

    // com canal
    i.options!.getChannel = vi
      .fn()
      .mockReturnValue({ id: "ch-cmd" } as TextChannel);
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(state.bot_commands_channels).toEqual([]);
  });

  it("comandos status: mostra status atual", async () => {
    state.restrict_commands = true;
    state.bot_commands_channels = ["ch-cmd-1"];
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("comandos");
    i.options!.getString = vi
      .fn()
      .mockImplementation((k: string) => (k === "acao" ? "status" : null));
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalled();
    const args = (i.reply as unknown).mock.calls[0][0];
    expect(args.embeds?.length).toBe(1);
  });

  it("remover: all com sucesso", async () => {
    state.embeds_channel = "ch-embeds";
    state.xp_channels = ["ch-xp"];
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("remover");
    i.options!.getString = vi.fn().mockReturnValue("all");
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Todas as configurações"),
      }),
    );
  });

  it("remover: todas as funcionalidades individuais", async () => {
    const funcionalidades = [
      "embeds",
      "perfil-quiz",
      "squad-quiz",
      "admin-commands",
      "level-up",
    ];

    for (const func of funcionalidades) {
      state = defaultChannelConfig("guild-1");
      const i = makeInteraction();
      i.options!.getSubcommand = vi.fn().mockReturnValue("remover");
      i.options!.getString = vi.fn().mockReturnValue(func);
      await handleConfigCanais(i as ChatInputCommandInteraction);
      expect(i.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("removida"),
        }),
      );
    }
  });

  it("remover: funcionalidade não reconhecida", async () => {
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("remover");
    i.options!.getString = vi.fn().mockReturnValue("invalid-func");
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Funcionalidade não reconhecida"),
      }),
    );
  });

  it("remover: falha ao remover funcionalidade específica", async () => {
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("remover");
    i.options!.getString = vi.fn().mockReturnValue("embeds");

    const storage = await import("@storage/channel-config.js");
    (storage.removeChannelConfig as unknown).mockResolvedValueOnce(false);

    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Erro ao remover"),
      }),
    );
  });

  it("subcomando não reconhecido", async () => {
    const i = makeInteraction();
    i.options!.getSubcommand = vi.fn().mockReturnValue("unknown-subcommand");
    await handleConfigCanais(i as ChatInputCommandInteraction);
    expect(i.reply).toHaveBeenCalledWith({
      content: "❌ Subcomando não reconhecido.",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("handleConfigXP deve processar ação adicionar", async () => {
    // @oraculo-disable-next-line tipo-literal-inline-complexo
    const mockInteraction = {
      guildId: "guild-xp-add",
      memberPermissions: {
        has: vi.fn().mockReturnValue(true),
      } as unknown,
      options: {
        getSubcommand: vi.fn().mockReturnValue("xp"),
        getString: vi.fn((key: string) => {
          if (key === "acao") return "adicionar";
          return null;
        }),
        getChannel: vi.fn().mockReturnValue({
          id: "channel-xp",
          toString: () => "<#channel-xp>",
        }),
      } as unknown,
      reply: vi.fn().mockResolvedValue({}),
    };

    await expect(
      handleConfigCanais(mockInteraction as unknown),
    ).resolves.not.toThrow();
  });

  it("handleConfigXP deve processar ação remover", async () => {
    // @oraculo-disable-next-line tipo-literal-inline-complexo
    const mockInteraction = {
      guildId: "guild-xp-remove",
      memberPermissions: {
        has: vi.fn().mockReturnValue(true),
      } as unknown,
      options: {
        getSubcommand: vi.fn().mockReturnValue("xp"),
        getString: vi.fn((key: string) => {
          if (key === "acao") return "remover";
          return null;
        }),
        getChannel: vi.fn().mockReturnValue({
          id: "channel-xp-remove",
          toString: () => "<#channel-xp-remove>",
        }),
      } as unknown,
      reply: vi.fn().mockResolvedValue({}),
    };

    await expect(
      handleConfigCanais(mockInteraction as unknown),
    ).resolves.not.toThrow();
  });

  it("handleConfigComandos deve processar ação adicionar", async () => {
    // @oraculo-disable-next-line tipo-literal-inline-complexo
    const mockInteraction = {
      guildId: "guild-cmd-add",
      memberPermissions: {
        has: vi.fn().mockReturnValue(true),
      } as unknown,
      options: {
        getSubcommand: vi.fn().mockReturnValue("comandos"),
        getString: vi.fn((key: string) => {
          if (key === "acao") return "adicionar";
          return null;
        }),
        getChannel: vi.fn().mockReturnValue({
          id: "channel-cmd",
          toString: () => "<#channel-cmd>",
        }),
      } as unknown,
      reply: vi.fn().mockResolvedValue({}),
    };

    await expect(
      handleConfigCanais(mockInteraction as unknown),
    ).resolves.not.toThrow();
  });

  it("handleConfigComandos deve processar ação remover", async () => {
    // @oraculo-disable-next-line tipo-literal-inline-complexo
    const mockInteraction = {
      guildId: "guild-cmd-remove",
      memberPermissions: {
        has: vi.fn().mockReturnValue(true),
      } as unknown,
      options: {
        getSubcommand: vi.fn().mockReturnValue("comandos"),
        getString: vi.fn((key: string) => {
          if (key === "acao") return "remover";
          return null;
        }),
        getChannel: vi.fn().mockReturnValue({
          id: "channel-cmd-remove",
          toString: () => "<#channel-cmd-remove>",
        }),
      } as unknown,
      reply: vi.fn().mockResolvedValue({}),
    };

    await expect(
      handleConfigCanais(mockInteraction as unknown),
    ).resolves.not.toThrow();
  });
});
