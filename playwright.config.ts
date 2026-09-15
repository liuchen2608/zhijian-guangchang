import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: "http://localhost:5181",
    viewport: { width: 1440, height: 900 },
    channel: "chrome",
  },
  webServer: {
    command: process.env.TEST_BUILD === "1" ? "npm run preview -- --port 5181 --strictPort" : "npm run dev -- --port 5181 --strictPort",
    url: "http://localhost:5181",
    reuseExistingServer: false,
  },
  reporter: "list",
});
