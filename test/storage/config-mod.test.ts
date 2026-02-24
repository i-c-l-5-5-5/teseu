import {
  getConfig,
  getQuizConfig,
  isMemoryStorageMode,
  setConfig,
  setQuizConfig,
} from "@storage/config-mod.js";
import { closeSQLite, getSQLite } from "@storage/sqlite.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Config Mod Storage", () => {
  beforeEach(() => {
    process.env.DB_PATH = ":memory:";
    getSQLite();
    delete process.env.CONFIG_STORAGE_MODE;
    delete process.env.NO_DB_CONFIG;
  });

  afterEach(() => {
    closeSQLite();
    delete process.env.DB_PATH;
    delete process.env.CONFIG_STORAGE_MODE;
    delete process.env.NO_DB_CONFIG;
  });

  describe("getConfig / setConfig", () => {
    it("deve retornar null para chave inexistente", async () => {
      const value = await getConfig("key-nonexistent");
      expect(value).toBeNull();
    });

    it("deve salvar e recuperar configuração", async () => {
      const success = await setConfig("test-key", "test-value");
      expect(success).toBe(true);

      const value = await getConfig("test-key");
      expect(value).toBe("test-value");
    });

    it("deve substituir valor existente", async () => {
      await setConfig("replace-key", "old-value");
      await setConfig("replace-key", "new-value");

      const value = await getConfig("replace-key");
      expect(value).toBe("new-value");
    });
  });

  describe("Quiz Config", () => {
    it("deve salvar e recuperar configuração de quiz", async () => {
      const quizConfig = {
        enabled: true,
        minQuestions: 5,
        maxQuestions: 10,
        timeLimit: 300,
      };

      const success = await setQuizConfig("guild-123", quizConfig);
      expect(success).toBe(true);

      const retrieved = await getQuizConfig("guild-123");
      expect(retrieved).toBeDefined();
    });

    it("deve retornar configuração padrão quando não configurado", async () => {
      const config = await getQuizConfig("guild-new");
      expect(config).toBeDefined();
    });
  });

  describe("Memory Storage Mode", () => {
    it("deve detectar CONFIG_STORAGE_MODE=memory", () => {
      process.env.CONFIG_STORAGE_MODE = "memory";
      expect(isMemoryStorageMode()).toBe(true);
    });

    it("deve detectar CONFIG_STORAGE_MODE=in-memory", () => {
      process.env.CONFIG_STORAGE_MODE = "in-memory";
      expect(isMemoryStorageMode()).toBe(true);
    });

    it("deve detectar CONFIG_STORAGE_MODE=mem", () => {
      process.env.CONFIG_STORAGE_MODE = "mem";
      expect(isMemoryStorageMode()).toBe(true);
    });

    it("deve detectar NO_DB_CONFIG=1 (legado)", () => {
      process.env.NO_DB_CONFIG = "1";
      expect(isMemoryStorageMode()).toBe(true);
    });

    it("deve retornar false quando não configurado", () => {
      expect(isMemoryStorageMode()).toBe(false);
    });

    it("deve ser case-insensitive", () => {
      process.env.CONFIG_STORAGE_MODE = "MEMORY";
      expect(isMemoryStorageMode()).toBe(true);
    });
  });

  describe("Squad Default Role Names", () => {
    it("deve retornar nomes padrão para roles de squad", async () => {
      // Função interna, testamos indiretamente via getQuizConfig
      const config = await getQuizConfig("guild-defaults");
      expect(config).toBeDefined();
    });
  });

  describe("removeConfig", () => {
    it("deve remover configuração existente", async () => {
      const { removeConfig } = await import("@storage/config-mod.js");
      await setConfig("remove-key", "remove-value");
      const removed = await removeConfig("remove-key");
      expect(removed).toBe(true);
      const value = await getConfig("remove-key");
      expect(value).toBeNull();
    });

    it("deve retornar true mesmo se chave não existir", async () => {
      const { removeConfig } = await import("@storage/config-mod.js");
      const removed = await removeConfig("nonexistent-key");
      expect(removed).toBe(true);
    });
  });

  describe("getAllConfig", () => {
    it("deve listar todas as configurações", async () => {
      const { getAllConfig } = await import("@storage/config-mod.js");
      await setConfig("key1", "value1");
      await setConfig("key2", "value2");
      await setConfig("key3", "value3");
      const all = await getAllConfig();
      expect(all.key1).toBe("value1");
      expect(all.key2).toBe("value2");
      expect(all.key3).toBe("value3");
    });

    it("deve retornar objeto vazio quando sem configurações", async () => {
      const { getAllConfig } = await import("@storage/config-mod.js");
      const all = await getAllConfig();
      expect(all).toBeDefined();
      expect(typeof all).toBe("object");
    });
  });

  describe("getSquadRoleName", () => {
    it("deve retornar nome padrão quando sem customização", async () => {
      const { getSquadRoleName } = await import("@storage/config-mod.js");
      const name = await getSquadRoleName("guild-default-squad", "Analyst");
      expect(name).toBe("Analyst");
    });

    it("deve retornar nome customizado quando configurado", async () => {
      const { getSquadRoleName } = await import("@storage/config-mod.js");
      await setConfig("guild-123_squad_role_analyst", "Custom Analyst");
      const name = await getSquadRoleName("guild-123", "Analyst");
      expect(name).toBe("Custom Analyst");
    });

    it("deve retornar squadType como fallback para tipo desconhecido", async () => {
      const { getSquadRoleName } = await import("@storage/config-mod.js");
      const name = await getSquadRoleName("guild-123", "UnknownType");
      expect(name).toBe("UnknownType");
    });

    it("deve normalizar squadType para lowercase na chave", async () => {
      const { getSquadRoleName } = await import("@storage/config-mod.js");
      await setConfig("guild-456_squad_role_diplomat", "Custom Diplomat");
      const name = await getSquadRoleName("guild-456", "Diplomat");
      expect(name).toBe("Custom Diplomat");
    });
  });

  describe("recordQuizAnswer", () => {
    it("deve retornar true (stub placeholder)", async () => {
      const { recordQuizAnswer } = await import("@storage/config-mod.js");
      const result = await recordQuizAnswer("user-1", "guild-1", 0, 1);
      expect(result).toBe(true);
    });
  });

  describe("getQuiz (wrapper legado)", () => {
    it("deve funcionar como alias para getQuizConfig", async () => {
      const { getQuiz } = await import("@storage/config-mod.js");
      const config = await getQuiz("guild-legacy");
      expect(config).toBeDefined();
      expect(config.enabled).toBe(false);
    });
  });
});
