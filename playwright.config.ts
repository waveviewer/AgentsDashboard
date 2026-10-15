import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config. Boots the app in production mode against a throwaway
 * SQLite file and runs the critical operator flow (login → list → detail → edit → delete).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm build && pnpm start -p 3100",
        url: "http://localhost:3100",
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
          DATABASE_URL: "./data/e2e.db",
          BETTER_AUTH_SECRET: "e2e-test-secret-at-least-32-characters-long",
          BETTER_AUTH_URL: "http://localhost:3100",
        },
      },
});
