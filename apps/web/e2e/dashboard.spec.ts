import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");

  const email = `e2e+${Date.now()}@example.com`;
  const magicLinkResponsePromise = page.waitForResponse((res) => res.url().includes("/api/auth/magic-link") && res.ok());

  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send login link" }).click();

  const magicLinkResponse = await magicLinkResponsePromise;
  const json = (await magicLinkResponse.json()) as { loginUrl?: string };
  if (!json.loginUrl) throw new Error("Expected loginUrl in /api/auth/magic-link response (E2E_TEST_MODE)");

  await page.goto(json.loginUrl);
  await expect(page).toHaveURL(/\/projects/);
}

test("dashboard navigation", async ({ page }) => {
  await login(page);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/projects/);

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Account settings" })).toBeVisible();
});

