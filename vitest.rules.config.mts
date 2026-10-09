import { defineConfig } from "vitest/config";

// Security-rules tests need the Firestore and Storage emulators: `npm run test:rules`.
export default defineConfig({
  test: { include: ["tests/rules/*.test.ts"], environment: "node", testTimeout: 20000, fileParallelism: false },
});
