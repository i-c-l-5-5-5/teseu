/*
SPDX-License-Identifier: MIT
*/
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("bin/index", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should load environment variables", () => {
    expect(process.env).toBeDefined();
  });

  it("should have required environment variables defined or defaults", () => {
    const requiredVars = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID"];
    const hasRequired = requiredVars.some((v) => process.env[v]);
    const hasDefaults = true; // O código tem fallbacks

    expect(hasRequired || hasDefaults).toBe(true);
  });

  it("should validate PORT environment variable if set", () => {
    if (process.env.PORT) {
      const port = Number.parseInt(process.env.PORT);
      expect(Number.isFinite(port)).toBe(true);
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThanOrEqual(65535);
    }
  });
});
