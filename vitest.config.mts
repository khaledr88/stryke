import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@shared": path.resolve(import.meta.dirname, "shared"), "@": path.resolve(import.meta.dirname, "src"), "@core": path.resolve(import.meta.dirname, "core") } },
  test: { include: ["tests/*.test.ts", "tests/core/*.test.ts"], environment: "node", testTimeout: 20000 },
});
