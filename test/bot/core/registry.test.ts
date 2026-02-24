/*
SPDX-License-Identifier: MIT
*/
import { botRegistry } from "@bot/core/registry.js";
import { describe, expect, it } from "vitest";

describe("Command Registry", () => {
  const registry = botRegistry;

  describe("botRegistry instance", () => {
    it("deve estar disponível como singleton", () => {
      expect(registry).toBeDefined();
      expect(registry.commands).toBeDefined();
    });

    it("deve ter coleções inicializadas", () => {
      expect(registry.commands).toBeInstanceOf(Map);
      expect(registry.components).toBeInstanceOf(Map);
      expect(registry.events).toBeInstanceOf(Map);
    });
  });

  describe("Métodos públicos", () => {
    it("deve ter métodos essenciais disponíveis", () => {
      expect(typeof registry.register).toBe("function");
      expect(typeof registry.unregister).toBe("function");
      expect(typeof registry.executeCommand).toBe("function");
      expect(typeof registry.executeComponent).toBe("function");
      expect(typeof registry.registerEvents).toBe("function");
    });

    it("deve ter métodos de verificação disponíveis", () => {
      expect(typeof registry.hasCommand).toBe("function");
      expect(typeof registry.hasComponent).toBe("function");
      expect(typeof registry.getStats).toBe("function");
    });

    it("deve ter método de limpeza de cooldowns", () => {
      expect(typeof registry.clearCooldowns).toBe("function");
    });
  });

  describe("Estatísticas", () => {
    it("deve retornar estatísticas do registry", () => {
      const stats = registry.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.commands).toBe("number");
      expect(typeof stats.components).toBe("number");
      expect(typeof stats.events).toBe("number");
      expect(typeof stats.activeCooldowns).toBe("number");
      expect(Array.isArray(stats.commandNames)).toBe(true);
      expect(Array.isArray(stats.componentIds)).toBe(true);
      expect(Array.isArray(stats.eventNames)).toBe(true);
    });
  });

  describe("Verificação de comandos", () => {
    it("deve verificar se comando existe", () => {
      const result = registry.hasCommand("test-command");
      expect(typeof result).toBe("boolean");
    });

    it("deve verificar se componente existe", () => {
      const result = registry.hasComponent("test-component");
      expect(typeof result).toBe("boolean");
    });
  });

  describe("Cooldown Management", () => {
    it("deve permitir limpar todos os cooldowns", () => {
      expect(() => registry.clearCooldowns()).not.toThrow();
    });

    it("deve retornar número de cooldowns ativos nas estatísticas", () => {
      const stats = registry.getStats();
      expect(typeof stats.activeCooldowns).toBe("number");
      expect(stats.activeCooldowns).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Register e Unregister", () => {
    it("deve permitir registrar comando via mock", () => {
      const mockCommand = {
        data: { name: "test-command-mock" },
        handler: async () => {},
      };

      expect(() => registry.register(mockCommand as any)).not.toThrow();
    });

    it("deve permitir desregistrar comando", () => {
      expect(() =>
        registry.unregister("test-command", "command"),
      ).not.toThrow();
    });

    it("deve permitir registrar componente via mock", () => {
      const mockComponent = {
        customId: "test-component-id",
        type: "button",
        handler: async () => {},
      };

      expect(() => registry.register(mockComponent as any)).not.toThrow();
    });

    it("deve permitir registrar evento via mock", () => {
      const mockEvent = {
        name: "ready",
        once: true,
        execute: async () => {},
      };

      expect(() => registry.register(mockEvent as any)).not.toThrow();
    });
  });

  describe("Command Names e IDs", () => {
    it("deve listar nomes de comandos registrados", () => {
      const stats = registry.getStats();
      expect(Array.isArray(stats.commandNames)).toBe(true);
    });

    it("deve listar IDs de componentes registrados", () => {
      const stats = registry.getStats();
      expect(Array.isArray(stats.componentIds)).toBe(true);
    });

    it("deve listar nomes de eventos registrados", () => {
      const stats = registry.getStats();
      expect(Array.isArray(stats.eventNames)).toBe(true);
    });
  });
});
