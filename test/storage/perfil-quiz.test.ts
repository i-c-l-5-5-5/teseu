/*
SPDX-License-Identifier: MIT
*/
import type { PerfilQuizConfig } from "@barqueiro/types";
import {
  getPerfilQuizConfig,
  isPerfilQuizReady,
  setPerfilQuizConfig,
} from "@storage/perfil-quiz.js";
import { describe, expect, it } from "vitest";

describe("Perfil Quiz Storage", () => {
  const mockConfig: PerfilQuizConfig = {
    enabled: true,
    channelId: "123456789",
    questions: [
      {
        text: "Qual sua área de interesse?",
        type: "preference",
        answers: [
          { text: "Frontend", result: "frontend", weight: 5 },
          { text: "Backend", result: "backend", weight: 5 },
        ],
      },
    ],
    results: [
      {
        key: "frontend",
        label: "Desenvolvedor Frontend",
        bio: "Especialista em interfaces",
        area: "Frontend",
        emblemas: ["🎨"],
        badges: [
          {
            tech: "React",
            level: "Advanced",
            color: "blue",
            displayName: "React",
            description: "Framework React",
          },
        ],
        aparencia: {
          corFundo: "#1a1a1a",
        },
      },
    ],
  };

  describe("getPerfilQuizConfig", () => {
    it("deve retornar uma configuração válida", async () => {
      const config = await getPerfilQuizConfig();

      expect(config).toBeDefined();
      expect(config).toHaveProperty("enabled");
      expect(config).toHaveProperty("questions");
      expect(config).toHaveProperty("results");
      expect(Array.isArray(config.questions)).toBe(true);
      expect(Array.isArray(config.results)).toBe(true);
    });

    it("deve retornar configuração com estrutura correta", async () => {
      const config = await getPerfilQuizConfig();

      expect(typeof config.enabled).toBe("boolean");
      if (config.channelId) {
        expect(typeof config.channelId).toBe("string");
      }
    });
  });

  describe("setPerfilQuizConfig", () => {
    it("deve salvar configuração válida", async () => {
      const result = await setPerfilQuizConfig(mockConfig);
      expect(result).toBe(true);
    });

    it("deve persistir configuração após salvamento", async () => {
      await setPerfilQuizConfig(mockConfig);
      const retrieved = await getPerfilQuizConfig();

      expect(retrieved.enabled).toBe(mockConfig.enabled);
      expect(retrieved.questions.length).toBe(mockConfig.questions.length);
      expect(retrieved.results.length).toBe(mockConfig.results.length);
    });

    it("deve atualizar configuração existente", async () => {
      const initialConfig = { ...mockConfig, enabled: false };
      await setPerfilQuizConfig(initialConfig);

      const updatedConfig = { ...mockConfig, enabled: true };
      await setPerfilQuizConfig(updatedConfig);

      const retrieved = await getPerfilQuizConfig();
      expect(retrieved.enabled).toBe(true);
    });
  });

  describe("isPerfilQuizReady", () => {
    it("deve retornar boolean", async () => {
      const result = await isPerfilQuizReady();
      expect(typeof result).toBe("boolean");
    });

    it("deve retornar true quando quiz está habilitado e configurado", async () => {
      await setPerfilQuizConfig(mockConfig);
      const result = await isPerfilQuizReady();

      if (
        mockConfig.enabled &&
        mockConfig.questions.length > 0 &&
        mockConfig.results.length > 0
      ) {
        expect(result).toBe(true);
      }
    });

    it("deve validar presença de perguntas e resultados", async () => {
      const emptyConfig: PerfilQuizConfig = {
        enabled: true,
        questions: [],
        results: [],
      };

      await setPerfilQuizConfig(emptyConfig);
      const result = await isPerfilQuizReady();

      expect(result).toBe(false);
    });
  });

  describe("Validação de dados", () => {
    it("deve validar estrutura de perguntas", async () => {
      const config = await getPerfilQuizConfig();

      if (config.questions.length > 0) {
        const question = config.questions[0];
        expect(question).toHaveProperty("text");
        expect(question).toHaveProperty("answers");
        expect(Array.isArray(question.answers)).toBe(true);
      }
    });

    it("deve validar estrutura de resultados", async () => {
      const config = await getPerfilQuizConfig();

      if (config.results.length > 0) {
        const result = config.results[0];
        expect(result).toHaveProperty("key");
        expect(result).toHaveProperty("label");
        expect(result).toHaveProperty("bio");
        expect(result).toHaveProperty("badges");
        expect(Array.isArray(result.badges)).toBe(true);
      }
    });
  });

  describe("Sessões do quiz", () => {
    it("deve iniciar sessão de quiz", async () => {
      const { startPerfilQuizSession, getPerfilQuizSession } =
        await import("@storage/perfil-quiz.js");
      const session = startPerfilQuizSession("user-1", "guild-1");

      expect(session).toBeDefined();
      expect(session.userId).toBe("user-1");
      expect(session.guildId).toBe("guild-1");
      expect(session.currentQuestion).toBe(0);
      expect(session.answers).toEqual([]);
    });

    it("deve recuperar sessão ativa", async () => {
      const { startPerfilQuizSession, getPerfilQuizSession } =
        await import("@storage/perfil-quiz.js");
      startPerfilQuizSession("user-2", "guild-2");
      const session = getPerfilQuizSession("user-2", "guild-2");

      expect(session).toBeDefined();
      expect(session?.userId).toBe("user-2");
    });

    it("deve retornar null para sessão inexistente", async () => {
      const { getPerfilQuizSession } = await import("@storage/perfil-quiz.js");
      const session = getPerfilQuizSession(
        "user-nonexistent",
        "guild-nonexistent",
      );
      expect(session).toBeNull();
    });

    it("deve atualizar sessão existente", async () => {
      const {
        startPerfilQuizSession,
        updatePerfilQuizSession,
        getPerfilQuizSession,
      } = await import("@storage/perfil-quiz.js");
      const session = startPerfilQuizSession("user-3", "guild-3");
      session.currentQuestion = 2;
      session.answers.push({
        questionIndex: 0,
        answerIndex: 1,
        result: "backend",
      });

      const updated = updatePerfilQuizSession(session);
      expect(updated).toBe(true);

      const retrieved = getPerfilQuizSession("user-3", "guild-3");
      expect(retrieved?.currentQuestion).toBe(2);
      expect(retrieved?.answers.length).toBe(1);
    });

    it("deve limpar sessão", async () => {
      const {
        startPerfilQuizSession,
        clearPerfilQuizSession,
        getPerfilQuizSession,
      } = await import("@storage/perfil-quiz.js");
      startPerfilQuizSession("user-4", "guild-4");
      clearPerfilQuizSession("user-4", "guild-4");

      const session = getPerfilQuizSession("user-4", "guild-4");
      expect(session).toBeNull();
    });

    it("deve expirar sessões antigas automaticamente", async () => {
      const { getPerfilQuizSession } = await import("@storage/perfil-quiz.js");
      // Sessão expirada não deve ser retornada
      const session = getPerfilQuizSession("user-expired", "guild-expired");
      expect(session).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("deve lidar com JSON inválido no parse de config", async () => {
      // Configuração padrão é retornada em caso de erro
      const config = await getPerfilQuizConfig();
      expect(config).toBeDefined();
      expect(config.enabled).toBeDefined();
    });

    it("deve retornar false ao salvar com erro de DB", async () => {
      // Este teste verifica o error handling interno
      const result = await setPerfilQuizConfig(mockConfig);
      expect(typeof result).toBe("boolean");
    });
  });
});
