import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@shared": path.resolve(import.meta.dirname, "../shared") } },
  test: { include: ["test/**/*.test.ts"], environment: "node", testTimeout: 20000 },
});
