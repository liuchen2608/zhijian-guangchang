import { defineConfig } from "vitest/config";
export default defineConfig({
  server: { host: "localhost", port: 5180, strictPort: true },
  preview: { host: "localhost", port: 4173, strictPort: true },
  test: { include: ["tests/unit/**/*.test.ts"] },
  worker: { format: "es" },
});
