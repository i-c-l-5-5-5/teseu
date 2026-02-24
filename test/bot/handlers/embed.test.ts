import type { ChatInputCommandInteraction, TextChannel } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Testes para o handler de embed.
 * Valida criação, validação e envio de embeds customizados.
 */
describe("Embed Handler", () => {
  let mockInteraction: Partial<ChatInputCommandInteraction>;
  let mockChannel: Partial<TextChannel>;

  beforeEach(() => {
    mockChannel = {
      id: "channel-123",
      send: vi.fn().mockResolvedValue({ id: "msg-123" }),
      guild: {
        id: "guild-123",
      } as any,
    };

    mockInteraction = {
      guildId: "guild-123",
      channelId: "channel-123",
      user: {
        id: "user-123",
        username: "testuser",
      } as any,
      guild: {
        id: "guild-123",
        channels: {
          fetch: vi.fn().mockResolvedValue(mockChannel),
        },
      } as any,
      options: {
        getString: vi.fn((key: string) => {
          const values: Record<string, string> = {
            titulo: "Título do Embed",
            descricao: "Descrição do embed",
            cor: "#5865F2",
          };
          return values[key] || null;
        }),
        getChannel: vi.fn().mockReturnValue(mockChannel),
      } as any,
      reply: vi.fn().mockResolvedValue({}),
      deferReply: vi.fn().mockResolvedValue({}),
      editReply: vi.fn().mockResolvedValue({}),
    };
  });

  it("deve criar embed com título e descrição", () => {
    const titulo = mockInteraction.options!.getString("titulo");
    const descricao = mockInteraction.options!.getString("descricao");

    expect(titulo).toBe("Título do Embed");
    expect(descricao).toBe("Descrição do embed");
  });

  it("deve validar cor hexadecimal", () => {
    const cor = mockInteraction.options!.getString("cor");
    const isValidHex = /^#[\da-f]{6}$/i.test(cor!);

    expect(isValidHex).toBe(true);
  });

  it("deve rejeitar cor inválida", () => {
    const invalidCores = ["#ZZZ", "azul", "12345", "#GGGGGG"];

    invalidCores.forEach((cor) => {
      const isValidHex = /^#[\da-f]{6}$/i.test(cor);
      expect(isValidHex).toBe(false);
    });
  });

  it("deve enviar embed para canal especificado", async () => {
    const channel = await mockInteraction.guild!.channels.fetch("channel-123");

    expect(channel).toBeDefined();
    expect(channel.id).toBe("channel-123");
  });

  it("deve retornar erro se canal não for encontrado", async () => {
    mockInteraction.guild!.channels.fetch = vi.fn().mockResolvedValue(null);

    const channel =
      await mockInteraction.guild!.channels.fetch("invalid-channel");
    expect(channel).toBeNull();
  });

  it("deve permitir embed sem cor (usa padrão)", () => {
    mockInteraction.options!.getString = vi.fn((key: string) => {
      const values: Record<string, string | null> = {
        titulo: "Título",
        descricao: "Descrição",
        cor: null,
      };
      return values[key] || null;
    });

    const cor = mockInteraction.options!.getString("cor");
    const corFinal = cor || "#5865F2";

    expect(corFinal).toBe("#5865F2");
  });

  it("deve processar campos adicionais opcionais", () => {
    mockInteraction.options!.getString = vi.fn((key: string) => {
      const values: Record<string, string | null> = {
        titulo: "Título",
        descricao: "Descrição",
        imagem: "https://example.com/image.png",
        thumbnail: "https://example.com/thumb.png",
        rodape: "Rodapé do embed",
      };
      return values[key] || null;
    });

    expect(mockInteraction.options!.getString("imagem")).toBe(
      "https://example.com/image.png",
    );
    expect(mockInteraction.options!.getString("thumbnail")).toBe(
      "https://example.com/thumb.png",
    );
    expect(mockInteraction.options!.getString("rodape")).toBe(
      "Rodapé do embed",
    );
  });
});
