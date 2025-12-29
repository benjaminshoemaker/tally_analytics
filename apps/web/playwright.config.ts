import { defineConfig, devices } from "@playwright/test";

const channel = process.env.PLAYWRIGHT_CHANNEL;
const defaultBaseUrl = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? defaultBaseUrl,
    trace: "retain-on-failure",
    ...(channel ? { channel } : {}),
  },
  webServer: {
    command: "pnpm db:push && pnpm dev:e2e",
    url: `${defaultBaseUrl}/login`,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/postgres",
      NEXT_PUBLIC_APP_URL: defaultBaseUrl,
      NEXT_PUBLIC_EVENTS_URL: process.env.NEXT_PUBLIC_EVENTS_URL ?? "http://127.0.0.1:3001",
      RESEND_API_KEY: process.env.RESEND_API_KEY ?? "e2e",
      FROM_EMAIL: process.env.FROM_EMAIL ?? "e2e@example.com",
      E2E_TEST_MODE: "1",
      WATCHPACK_POLLING: "true",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
