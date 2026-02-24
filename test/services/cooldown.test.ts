/*
SPDX-License-Identifier: MIT
*/
import {
  clearCooldown,
  getCooldownRemaining,
  isInCooldown,
  setCooldown,
} from "@services/cooldown.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Cooldown Service", () => {
  beforeEach(() => {
    // Limpar cooldowns antes de cada teste
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("setCooldown", () => {
    it("deve definir um cooldown para uma chave específica", () => {
      const key = "test-user:command";
      const duration = 5000; // 5 segundos

      setCooldown(key, duration);

      expect(isInCooldown(key)).toBe(true);
    });

    it("deve aceitar duração em milissegundos", () => {
      const key = "test-user:command";
      setCooldown(key, 10000);

      expect(isInCooldown(key)).toBe(true);
    });
  });

  describe("isInCooldown", () => {
    it("deve retornar false para chave sem cooldown", () => {
      const key = "non-existent-key";
      expect(isInCooldown(key)).toBe(false);
    });

    it("deve retornar true para cooldown ativo", () => {
      const key = "test-user:command";
      setCooldown(key, 5000);

      expect(isInCooldown(key)).toBe(true);
    });

    it("deve retornar false após cooldown expirar", () => {
      const key = "test-user:command";
      setCooldown(key, 1000);

      expect(isInCooldown(key)).toBe(true);

      // Avançar tempo em 1100ms
      vi.advanceTimersByTime(1100);

      expect(isInCooldown(key)).toBe(false);
    });
  });

  describe("getCooldownRemaining", () => {
    it("deve retornar 0 para chave sem cooldown", () => {
      const key = "non-existent-key";
      expect(getCooldownRemaining(key)).toBe(0);
    });

    it("deve retornar tempo restante correto", () => {
      const key = "test-user:command";
      const duration = 10000; // 10 segundos

      setCooldown(key, duration);

      // Avançar 3 segundos
      vi.advanceTimersByTime(3000);

      const remaining = getCooldownRemaining(key);
      expect(remaining).toBeGreaterThan(6);
      expect(remaining).toBeLessThanOrEqual(7);
    });

    it("deve retornar 0 após cooldown expirar", () => {
      const key = "test-user:command";
      setCooldown(key, 1000);

      vi.advanceTimersByTime(1100);

      expect(getCooldownRemaining(key)).toBe(0);
    });
  });

  describe("clearCooldown", () => {
    it("deve remover cooldown ativo", () => {
      const key = "test-user:command";
      setCooldown(key, 5000);

      expect(isInCooldown(key)).toBe(true);

      clearCooldown(key);

      expect(isInCooldown(key)).toBe(false);
    });

    it("não deve gerar erro ao limpar cooldown inexistente", () => {
      const key = "non-existent-key";
      expect(() => clearCooldown(key)).not.toThrow();
    });
  });

  describe("Múltiplos cooldowns", () => {
    it("deve gerenciar múltiplos cooldowns independentemente", () => {
      const key1 = "user1:command";
      const key2 = "user2:command";

      setCooldown(key1, 5000);
      setCooldown(key2, 10000);

      expect(isInCooldown(key1)).toBe(true);
      expect(isInCooldown(key2)).toBe(true);

      vi.advanceTimersByTime(6000);

      expect(isInCooldown(key1)).toBe(false);
      expect(isInCooldown(key2)).toBe(true);
    });
  });
});
