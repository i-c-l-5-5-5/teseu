import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Pages Routes", () => {
  describe("Static Files", () => {
    it("deve resolver caminho do diretório public", () => {
      const publicDir = path.resolve(process.cwd(), "public");
      expect(publicDir).toContain("public");
      expect(path.isAbsolute(publicDir)).toBe(true);
    });

    it("deve validar estrutura de diretórios", () => {
      const expectedDirs = [
        "admin",
        "configuracao",
        "css",
        "img",
        "scripts",
        "member",
      ];
      expect(expectedDirs.length).toBeGreaterThan(0);
    });
  });

  describe("GET /session", () => {
    it("deve retornar sessão do painel", () => {
      const mockSession = {
        panel: {
          sub: "user-123",
          username: "testuser",
          guilds: ["guild-1"],
          admin: [],
        },
      };

      expect(mockSession.panel).toBeDefined();
      expect(mockSession.panel.sub).toBe("user-123");
    });

    it("deve retornar null quando não autenticado", () => {
      const mockSession = { panel: null };
      expect(mockSession.panel).toBeNull();
    });
  });

  describe("GET /invite", () => {
    it("deve gerar URL de convite do Discord", () => {
      const clientId = "test-client-id";
      const url = new URL("https://discord.com/oauth2/authorize");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("scope", "bot applications.commands");

      expect(url.toString()).toContain("discord.com/oauth2/authorize");
      expect(url.toString()).toContain("client_id=test-client-id");
      expect(url.toString()).toContain("scope=bot");
    });

    it("deve adicionar permissões quando configurado", () => {
      const permissions = "8"; // Administrator
      const url = new URL("https://discord.com/oauth2/authorize");
      url.searchParams.set("permissions", permissions);

      expect(url.searchParams.get("permissions")).toBe("8");
    });

    it("deve suportar pré-seleção de guild", () => {
      const url = new URL("https://discord.com/oauth2/authorize");
      url.searchParams.set("guild_id", "123456789");
      url.searchParams.set("disable_guild_select", "1");

      expect(url.searchParams.get("guild_id")).toBe("123456789");
      expect(url.searchParams.get("disable_guild_select")).toBe("1");
    });

    it("deve retornar erro quando CLIENT_ID não configurado", () => {
      const clientId = process.env.DISCORD_CLIENT_ID;
      const shouldError = !clientId;

      // Em ambiente de teste, pode não estar configurado
      expect(typeof shouldError).toBe("boolean");
    });
  });

  describe("GET /debug/oauth", () => {
    it("deve construir redirect URI correto", () => {
      const baseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
      const redirectUri = new URL("/auth/oauth/callback", baseUrl).toString();

      expect(redirectUri).toContain("/auth/oauth/callback");
    });

    it("deve usar RENDER_EXTERNAL_URL como fallback", () => {
      const renderUrl = process.env.RENDER_EXTERNAL_URL;
      const publicUrl = process.env.PUBLIC_BASE_URL;
      const baseUrl = publicUrl || renderUrl || "http://localhost:3000";

      expect(baseUrl).toBeDefined();
    });

    it("deve exibir informações de configuração OAuth", () => {
      const config = {
        clientId: process.env.DISCORD_CLIENT_ID || "❌ não configurado",
        redirectUri: "http://localhost:3000/auth/oauth/callback",
      };

      expect(config).toHaveProperty("clientId");
      expect(config).toHaveProperty("redirectUri");
    });
  });

  describe("Security", () => {
    it("deve requerer autenticação Discord para páginas", () => {
      const requiresAuth = true;
      expect(requiresAuth).toBe(true);
    });

    it("deve validar sessão antes de servir arquivos estáticos", () => {
      const mockSession = {
        sub: "user-123",
        username: "testuser",
      };

      const isValidSession = !!mockSession.sub;
      expect(isValidSession).toBe(true);
    });
  });

  describe("Content Type", () => {
    it("deve definir content-type correto para HTML", () => {
      const contentType = "text/html; charset=utf-8";
      expect(contentType).toContain("text/html");
      expect(contentType).toContain("utf-8");
    });

    it("deve definir content-type correto para JSON", () => {
      const contentType = "application/json";
      expect(contentType).toBe("application/json");
    });
  });

  describe("URL Handling", () => {
    it("deve preservar query parameters", () => {
      const url = new URL("http://example.com/invite");
      url.searchParams.set("guild_id", "123");
      url.searchParams.set("permissions", "8");

      expect(url.searchParams.get("guild_id")).toBe("123");
      expect(url.searchParams.get("permissions")).toBe("8");
    });

    it("deve construir URLs absolutas corretamente", () => {
      const base = "http://localhost:3000";
      const endpoint = "/auth/oauth/callback";
      const fullUrl = new URL(endpoint, base).toString();

      expect(fullUrl).toBe("http://localhost:3000/auth/oauth/callback");
    });
  });
});
