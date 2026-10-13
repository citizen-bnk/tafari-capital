import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 180000,
  workers: 1,
  fullyParallel: false,
  use: {
    actionTimeout: 15000,
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3100",
    trace: "off",
    screenshot: "off",
  },
  reporter: "list",
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "npm run start -- -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: false,
        timeout: 60000,
        env: { SUPER_ADMIN_EMAIL: "tafari-e2e-superadmin@example.org" },
      },
});
