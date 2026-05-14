import { expect, type Locator, type Page, test } from "@playwright/test";

const forbiddenApiPrefixes = [
  "/api/projects",
  "/api/mcp",
  "/api/oauth",
  "/api/auth",
  "/api/stripe",
  "/api/analytics",
  "/v0/pipes",
];

async function expectInViewport(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const viewport = locator.page().viewportSize();
  expect(viewport).not.toBeNull();
  if (!viewport) return;

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectNoOverlap(first: Locator, second: Locator) {
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  if (!firstBox || !secondBox) return;

  const overlaps =
    firstBox.x < secondBox.x + secondBox.width &&
    firstBox.x + firstBox.width > secondBox.x &&
    firstBox.y < secondBox.y + secondBox.height &&
    firstBox.y + firstBox.height > secondBox.y;

  expect(overlaps).toBe(false);
}

function attachGuards(page: Page) {
  const requestedUrls: string[] = [];
  const consoleErrors: string[] = [];

  page.on("request", (request) => {
    requestedUrls.push(request.url());
  });

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  return { requestedUrls, consoleErrors };
}

function assertNoForbiddenRequests(requestedUrls: string[]) {
  const forbiddenRequests = requestedUrls.filter((url) => {
    const parsedUrl = new URL(url);
    return forbiddenApiPrefixes.some((prefix) => parsedUrl.pathname.startsWith(prefix));
  });

  expect(forbiddenRequests).toEqual([]);
}

test("@public-demo prospective user can inspect the public demo without auth or forbidden APIs", async ({
  page,
}, testInfo) => {
  const { requestedUrls, consoleErrors } = attachGuards(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("link", { name: "View demo dashboard" }).first().click();

  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText("This is demo data. Connect your repo for real analytics.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Acme Forms" })).toBeVisible();
  await expect(page.getByText(/See what Tally can answer/)).toBeVisible();
  await expect(page.getByText("Page views").first()).toBeVisible();
  await expect(page.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("link", { name: "Start with MCP" })).toHaveAttribute("href", "/docs/setup");

  await expectInViewport(page.getByText("This is demo data. Connect your repo for real analytics."));
  await expectInViewport(page.getByText(/See what Tally can answer/));
  await expectInViewport(page.getByText("18,420"));
  await expectInViewport(page.getByRole("button", { name: "Ask Tally" }));
  await expectNoOverlap(page.getByRole("heading", { name: "Acme Forms" }), page.getByText(/See what Tally can answer/));

  await page.screenshot({ path: testInfo.outputPath("public-demo-overview-desktop.png"), fullPage: false });

  await page.getByRole("tab", { name: "Live" }).click();
  await expect(page.getByText("form_started")).toBeVisible();
  await expect(page.getByText("/templates/customer-feedback")).toBeVisible();

  await page.getByRole("tab", { name: "Sessions" }).click();
  await expect(page.getByText("Total sessions")).toBeVisible();
  await expect(page.getByText("New visitors")).toBeVisible();
  await expect(page.getByText("Returning visitors")).toBeVisible();

  await page.getByRole("tab", { name: "Ask Tally" }).click();
  await page.getByRole("button", { name: "What should we track next?" }).click();
  await expect(page.getByText("form_published", { exact: true })).toBeVisible();
  await expect(page.getByText("Simulated MCP/agent output")).toBeVisible();
  await expect(page.getByText("Track form publish completion").first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("public-demo-ask-tally-desktop.png"), fullPage: false });

  await expect(page.getByText("Account settings")).toHaveCount(0);
  await expect(page.getByText("Billing")).toHaveCount(0);
  await expect(page.getByText("User menu")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /account|billing|settings/i })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  await expectInViewport(page.getByText("This is demo data. Connect your repo for real analytics."));
  await expectInViewport(page.getByRole("tab", { name: "Overview" }));
  await expect(page.getByText("18,420")).toBeVisible();
  await page.getByRole("tab", { name: "Ask Tally" }).click();
  await page.getByRole("button", { name: "What should we track next?" }).click();
  const mobileEventName = page.getByText("form_published", { exact: true });
  await expect(mobileEventName).toBeVisible();
  await mobileEventName.scrollIntoViewIfNeeded();
  await expectInViewport(mobileEventName);
  await page.screenshot({ path: testInfo.outputPath("public-demo-mobile.png"), fullPage: false });

  expect(consoleErrors).toEqual([]);
  assertNoForbiddenRequests(requestedUrls);
});
