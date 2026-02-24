/*
SPDX-License-Identifier: MIT
*/
import type { PerfilCustomizado } from "@barqueiro/types";
import { getPerfilCustomizado, setPerfilCustomizado } from "@storage/perfil.js";
import { describe, expect, it } from "vitest";

describe("Perfil Storage", () => {
  const mockPerfil: PerfilCustomizado = {
    user_id: "test-user-123",
    bio: "Desenvolvedor Full Stack apaixonado por tecnologia",
    area: "Full Stack",
    emblemas: ["🚀", "💻", "⚡"],
    badges: [
      {
        imageUrl: "https://example.com/badge1.png",
        nome: "TypeScript Expert",
        descricao: "Especialista em TypeScript",
      },
      {
        imageUrl: "https://example.com/badge2.png",
        nome: "React Advanced",
        descricao: "Desenvolvedor React avançado",
      },
    ],
    aparencia: {
      corFundo: "#1a1a2e",
    },
  };

  describe("setPerfilCustomizado", () => {
    it("deve salvar perfil customizado com sucesso", async () => {
      const result = await setPerfilCustomizado(mockPerfil);
      expect(result).toBe(true);
    });

    it("deve aceitar perfil com todos os campos obrigatórios", async () => {
      const minimalPerfil: PerfilCustomizado = {
        user_id: "minimal-user",
        bio: "Bio mínima",
        area: "Dev",
        emblemas: [],
        badges: [],
        aparencia: {
          corFundo: "#000000",
        },
      };

      const result = await setPerfilCustomizado(minimalPerfil);
      expect(result).toBe(true);
    });

    it("deve atualizar perfil existente", async () => {
      await setPerfilCustomizado(mockPerfil);

      const updatedPerfil = {
        ...mockPerfil,
        bio: "Nova bio atualizada",
      };

      const result = await setPerfilCustomizado(updatedPerfil);
      expect(result).toBe(true);
    });
  });

  describe("getPerfilCustomizado", () => {
    it("deve retornar null para usuário sem perfil", async () => {
      const perfil = await getPerfilCustomizado("non-existent-user");
      expect(perfil).toBeNull();
    });

    it("deve recuperar perfil salvo corretamente", async () => {
      await setPerfilCustomizado(mockPerfil);
      const retrieved = await getPerfilCustomizado(mockPerfil.user_id);

      expect(retrieved).not.toBeNull();
      if (retrieved) {
        expect(retrieved.user_id).toBe(mockPerfil.user_id);
        expect(retrieved.bio).toBe(mockPerfil.bio);
        expect(retrieved.area).toBe(mockPerfil.area);
        expect(retrieved.emblemas).toEqual(mockPerfil.emblemas);
      }
    });

    it("deve recuperar badges corretamente", async () => {
      await setPerfilCustomizado(mockPerfil);
      const retrieved = await getPerfilCustomizado(mockPerfil.user_id);

      expect(retrieved).not.toBeNull();
      if (retrieved) {
        expect(Array.isArray(retrieved.badges)).toBe(true);
        expect(retrieved.badges.length).toBe(mockPerfil.badges.length);

        if (retrieved.badges.length > 0) {
          expect(retrieved.badges[0]).toHaveProperty("imageUrl");
          expect(retrieved.badges[0]).toHaveProperty("nome");
          expect(retrieved.badges[0]).toHaveProperty("descricao");
        }
      }
    });

    it("deve recuperar aparência corretamente", async () => {
      await setPerfilCustomizado(mockPerfil);
      const retrieved = await getPerfilCustomizado(mockPerfil.user_id);

      expect(retrieved).not.toBeNull();
      if (retrieved) {
        expect(retrieved.aparencia).toHaveProperty("corFundo");
        expect(retrieved.aparencia).toHaveProperty("corTexto");
        expect(retrieved.aparencia).toHaveProperty("corDestaque");
        expect(retrieved.aparencia.corFundo).toBe(
          mockPerfil.aparencia.corFundo,
        );
      }
    });
  });

  describe("Validação de estrutura", () => {
    it("deve validar formato de cores hexadecimais", async () => {
      await setPerfilCustomizado(mockPerfil);
      const retrieved = await getPerfilCustomizado(mockPerfil.user_id);

      if (retrieved) {
        expect(retrieved.aparencia.corFundo).toMatch(/^#[\dA-Fa-f]{6}$/);
      }
    });

    it("deve validar array de emblemas", async () => {
      await setPerfilCustomizado(mockPerfil);
      const retrieved = await getPerfilCustomizado(mockPerfil.user_id);

      if (retrieved) {
        expect(Array.isArray(retrieved.emblemas)).toBe(true);
        retrieved.emblemas.forEach((emblema) => {
          expect(typeof emblema).toBe("string");
        });
      }
    });

    it("deve validar estrutura completa de badges", async () => {
      await setPerfilCustomizado(mockPerfil);
      const retrieved = await getPerfilCustomizado(mockPerfil.user_id);

      if (retrieved && retrieved.badges.length > 0) {
        retrieved.badges.forEach((badge) => {
          expect(typeof badge.imageUrl).toBe("string");
          expect(typeof badge.nome).toBe("string");
          expect(typeof badge.descricao).toBe("string");
        });
      }
    });
  });

  describe("getPerfilOuPadrao", () => {
    it("deve retornar perfil customizado quando existe", async () => {
      const { getPerfilOuPadrao } = await import("@storage/perfil.js");
      await setPerfilCustomizado(mockPerfil);
      const perfil = await getPerfilOuPadrao(mockPerfil.user_id);

      expect(perfil.user_id).toBe(mockPerfil.user_id);
      expect(perfil.bio).toBe(mockPerfil.bio);
    });

    it("deve retornar perfil padrão para usuário sem perfil", async () => {
      const { getPerfilOuPadrao } = await import("@storage/perfil.js");
      const perfil = await getPerfilOuPadrao("user-without-profile");

      expect(perfil.user_id).toBe("user-without-profile");
      expect(perfil.bio).toBe("Não informado");
      expect(perfil.area).toBe("Não informado");
      expect(perfil.emblemas).toEqual([]);
      expect(perfil.badges).toEqual([]);
      expect(perfil.aparencia).toBeDefined();
    });

    it("perfil padrão deve ter cores válidas", async () => {
      const { getPerfilOuPadrao } = await import("@storage/perfil.js");
      const perfil = await getPerfilOuPadrao("user-default-colors");

      expect(perfil.aparencia.corFundo).toBeDefined();
      expect(perfil.aparencia.corTexto).toBeDefined();
      expect(perfil.aparencia.corDestaque).toBeDefined();
    });
  });

  describe("criarPerfilExemplo", () => {
    it("deve criar perfil de exemplo completo", async () => {
      const { criarPerfilExemplo } = await import("@storage/perfil.js");
      const perfil = criarPerfilExemplo("example-user");

      expect(perfil.user_id).toBe("example-user");
      expect(perfil.bio).toBeDefined();
      expect(perfil.area).toBeDefined();
      expect(perfil.emblemas.length).toBeGreaterThan(0);
      expect(perfil.badges.length).toBeGreaterThan(0);
    });

    it("perfil exemplo deve ter badges válidos", async () => {
      const { criarPerfilExemplo } = await import("@storage/perfil.js");
      const perfil = criarPerfilExemplo("example-badges");

      perfil.badges.forEach((badge) => {
        expect(badge).toHaveProperty("imageUrl");
        expect(badge).toHaveProperty("nome");
        expect(badge).toHaveProperty("descricao");
      });
    });

    it("perfil exemplo deve ter aparência configurada", async () => {
      const { criarPerfilExemplo } = await import("@storage/perfil.js");
      const perfil = criarPerfilExemplo("example-appearance");

      expect(perfil.aparencia.corFundo).toBeDefined();
      expect(perfil.aparencia.corTexto).toBeDefined();
      expect(perfil.aparencia.corDestaque).toBeDefined();
    });
  });

  describe("Edge cases", () => {
    it("deve lidar com JSON inválido em aparencia", async () => {
      const { getSQLite } = await import("@storage/sqlite.js");
      const db = getSQLite();

      // Inserir perfil com JSON inválido manualmente
      db.prepare(
        `
        INSERT OR REPLACE INTO perfil 
        (user_id, bio, area, emblemas, badges, aparencia) 
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      ).run("invalid-json-user", "Bio", "Area", "[]", "[]", "invalid-json");

      const perfil = await getPerfilCustomizado("invalid-json-user");

      // Deve normalizar com defaults
      if (perfil) {
        expect(perfil.aparencia.corFundo).toBeDefined();
        expect(perfil.aparencia.corTexto).toBeDefined();
        expect(perfil.aparencia.corDestaque).toBeDefined();
      }
    });

    it("deve lidar com aparencia sem campos opcionais", async () => {
      const perfilSemImagem: PerfilCustomizado = {
        user_id: "no-image-user",
        bio: "Bio",
        area: "Area",
        emblemas: [],
        badges: [],
        aparencia: {
          corFundo: "#000000",
        },
      };

      await setPerfilCustomizado(perfilSemImagem);
      const retrieved = await getPerfilCustomizado("no-image-user");

      expect(retrieved).not.toBeNull();
      if (retrieved) {
        expect(retrieved.aparencia.imagemFundo).toBeUndefined();
      }
    });

    it("deve retornar null para perfil com estrutura inválida", async () => {
      const { getSQLite } = await import("@storage/sqlite.js");
      const db = getSQLite();

      // Inserir perfil com badges inválido
      db.prepare(
        `
        INSERT OR REPLACE INTO perfil 
        (user_id, bio, area, emblemas, badges, aparencia) 
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      ).run(
        "invalid-badges",
        "Bio",
        "Area",
        "[]",
        '[{"invalid": "badge"}]',
        '{"corFundo": "#000"}',
      );

      const perfil = await getPerfilCustomizado("invalid-badges");

      // Deve retornar null se validação falhar
      expect(perfil).toBeNull();
    });
  });
});
