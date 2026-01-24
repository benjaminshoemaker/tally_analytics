import { expect, test } from "@playwright/test";

test("login page shows GitHub OAuth UI", async ({ page }) => {
  await page.goto("/login");

  const githubLink = page.getByRole("link", { name: "Sign in with GitHub" });
  await expect(githubLink).toBeVisible();
  await expect(githubLink).toHaveAttribute("href", "/api/auth/github");

  await expect(page.getByLabel("Email")).toHaveCount(0);
});
