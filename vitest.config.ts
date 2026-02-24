/*
SPDX-License-Identifier: MIT
*/
import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 20000,
    hookTimeout: 20000,
    setupFiles: ["test/setup-strict.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "test/**",
        "**/*.config.{js,ts}",
        "scripts/**",
        "public/**",
        "src/tipos/**", // excluir definições de tipos da cobertura
        // registry.ts reincluído na cobertura após adicionar suíte dedicada
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@storage": path.resolve(__dirname, "./src/storage"),
      "@bot": path.resolve(__dirname, "./src/bot"),
      "@commands": path.resolve(__dirname, "./src/bot/commands"),
      "@handlers": path.resolve(__dirname, "./src/bot/handlers"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@server": path.resolve(__dirname, "./src/server"),
      "@core": path.resolve(__dirname, "./src/core"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@barqueiro/types": path.resolve(__dirname, "./src/tipos/index.ts"),
    },
  },
  coverage: {
    reporter: ["text", "lcov"],
    lines: 85,
    functions: 85,
    branches: 80,
    statements: 85,
    exclude: ["**/test/**", "**/*.test.ts"],
  },
});
