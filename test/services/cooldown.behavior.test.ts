import { beforeEach, describe, expect, it } from "vitest";

import {
  cleanupExpiredCooldowns,
  clearCooldown,
  getCooldownRemaining,
  isInCooldown,
  setCooldown,
} from "@/services/cooldown.js";

describe("Cooldown Service (behavior)", () => {
  beforeEach(() => {
    // Limpar cooldowns anteriores
    cleanupExpiredCooldowns();
  });

  it("deve retornar false quando não há cooldown ativo", () => {
    const key = "user-1:guild-1:test-command";
    const result = isInCooldown(key);
    expect(result).toBe(false);
  });

  it("deve retornar true durante o cooldown", () => {
    const key = "user-2:guild-2:test-command";
    setCooldown(key, 5000);

    const result = isInCooldown(key);
    expect(result).toBe(true);
  });

  it("deve permitir após cooldown expirar", async () => {
    const key = "user-3:guild-3:test-command";
    setCooldown(key, 100);

    // Esperar cooldown expirar
    await new Promise((resolve) => setTimeout(resolve, 150));

    const result = isInCooldown(key);
    expect(result).toBe(false);
  });

  it("deve isolar cooldowns por chaves diferentes", () => {
    const keyA = "user-a:guild-1:test-command";
    const keyB = "user-b:guild-1:test-command";

    setCooldown(keyA, 5000);

    expect(isInCooldown(keyA)).toBe(true);
    expect(isInCooldown(keyB)).toBe(false);
  });

  it("clearCooldown deve remover cooldown específico", () => {
    const key = "user-clear:guild-1:test-command";
    setCooldown(key, 5000);

    expect(isInCooldown(key)).toBe(true);

    clearCooldown(key);

    expect(isInCooldown(key)).toBe(false);
  });

  it("getCooldownRemaining deve retornar tempo restante em segundos", () => {
    const key = "user-remaining:guild-1:test-command";
    setCooldown(key, 5000);

    const remaining = getCooldownRemaining(key);

    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(5);
  });

  it("getCooldownRemaining deve retornar 0 quando não há cooldown", () => {
    const key = "user-no-cooldown:guild-1:test-command";

    const remaining = getCooldownRemaining(key);
    expect(remaining).toBe(0);
  });

  it("deve lidar com cooldown zero", () => {
    const key = "user-zero:guild-zero:test-command";
    setCooldown(key, 0);

    const result = isInCooldown(key);
    expect(result).toBe(false);
  });

  it("cleanupExpiredCooldowns deve remover cooldowns expirados", async () => {
    const key1 = "user-expired-1:guild-1:test-command";
    const key2 = "user-expired-2:guild-1:test-command";

    setCooldown(key1, 100);
    setCooldown(key2, 100);

    // Esperar expirar
    await new Promise((resolve) => setTimeout(resolve, 150));

    cleanupExpiredCooldowns();

    expect(isInCooldown(key1)).toBe(false);
    expect(isInCooldown(key2)).toBe(false);
  });

  it("deve manter cooldowns ativos após cleanup", () => {
    const key = "user-active:guild-1:test-command";
    setCooldown(key, 10000);

    cleanupExpiredCooldowns();

    expect(isInCooldown(key)).toBe(true);
  });
});
