import { defineConfig } from "vitest/config";

// Separate config for Firestore security-rules tests: they require the
// Firestore emulator (run via `npm run test:rules` inside emulators:exec).
export default defineConfig({
  test: {
    include: ["tests/rules/**/*.test.ts"],
    environment: "node",
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
