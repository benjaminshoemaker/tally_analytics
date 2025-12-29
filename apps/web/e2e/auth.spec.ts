import { expect, test } from "@playwright/test";

test("login flow", async ({ page }) => {
  await page.goto("/login");

  const email = `e2e+${Date.now()}@example.com`;

  const magicLinkResponsePromise = page.waitForResponse((res) => res.url().includes("/api/auth/magic-link") && res.ok());

  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send magic link" }).click();

  const magicLinkResponse = await magicLinkResponsePromise;
  const json = (await magicLinkResponse.json()) as { success: boolean; loginUrl?: string };
  expect(json.success).toBe(true);
  expect(json.loginUrl).toBeTruthy();

  await page.goto(json.loginUrl!);
  await expect(page).toHaveURL(/\/projects/);
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
});
