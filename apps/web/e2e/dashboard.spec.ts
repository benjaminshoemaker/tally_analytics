import { expect, test } from "@playwright/test";

import crypto from "node:crypto";

import { Client } from "pg";

const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5432/postgres";

async function createUser({ email }: { email: string }): Promise<string> {
  const userId = crypto.randomUUID();

  const client = new Client({ connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL });
  await client.connect();
  try {
    await client.query("INSERT INTO users (id, email) VALUES ($1, $2)", [userId, email]);
  } finally {
    await client.end();
  }

  return userId;
}

async function login(page: import("@playwright/test").Page) {
  const email = `e2e+${Date.now()}@example.com`;
  const userId = await createUser({ email });

  const response = await page.request.post("/api/auth/e2e-login", {
    data: { userId },
  });
  expect(response.ok()).toBe(true);

  await page.goto("/projects");
  await expect(page).toHaveURL(/\/projects/);
}

test("dashboard navigation", async ({ page }) => {
  await login(page);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/projects/);

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Account settings" })).toBeVisible();
});
