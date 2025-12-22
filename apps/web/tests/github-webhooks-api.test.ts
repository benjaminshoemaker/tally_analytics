import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";

let handleInstallationWebhookSpy: ReturnType<typeof vi.fn> | undefined;
let handleInstallationRepositoriesWebhookSpy: ReturnType<typeof vi.fn> | undefined;
let handlePullRequestWebhookSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/github/handlers/installation", () => ({
  handleInstallationWebhook: (...args: unknown[]) => {
    if (!handleInstallationWebhookSpy) throw new Error("handleInstallationWebhookSpy not initialized");
    return handleInstallationWebhookSpy(...args);
  },
  handleInstallationRepositoriesWebhook: (...args: unknown[]) => {
    if (!handleInstallationRepositoriesWebhookSpy)
      throw new Error("handleInstallationRepositoriesWebhookSpy not initialized");
    return handleInstallationRepositoriesWebhookSpy(...args);
  },
}));

vi.mock("../lib/github/handlers/pull-request", () => ({
  handlePullRequestWebhook: (...args: unknown[]) => {
    if (!handlePullRequestWebhookSpy) throw new Error("handlePullRequestWebhookSpy not initialized");
    return handlePullRequestWebhookSpy(...args);
  },
}));

function signBody(body: string, secret: string): string {
  const digest = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

describe("POST /api/webhooks/github", () => {
  it("accepts a signed webhook and routes by event", async () => {
    vi.resetModules();
    process.env.GITHUB_WEBHOOK_SECRET = "test_secret";
    handleInstallationWebhookSpy = vi.fn();
    handleInstallationRepositoriesWebhookSpy = vi.fn();
    handlePullRequestWebhookSpy = vi.fn().mockResolvedValue(undefined);

    const body = JSON.stringify({ hello: "world" });
    const signature = signBody(body, process.env.GITHUB_WEBHOOK_SECRET);

    const { POST } = await import("../app/api/webhooks/github/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "pull_request",
          "x-hub-signature-256": signature,
        },
        body,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, handledEvent: "pull_request" });
    expect(handlePullRequestWebhookSpy).toHaveBeenCalledWith({ hello: "world" });
  });

  it("returns 401 for an invalid signature", async () => {
    vi.resetModules();
    process.env.GITHUB_WEBHOOK_SECRET = "test_secret";
    handleInstallationWebhookSpy = vi.fn();
    handleInstallationRepositoriesWebhookSpy = vi.fn();
    handlePullRequestWebhookSpy = vi.fn();

    const body = JSON.stringify({ hello: "world" });

    const { POST } = await import("../app/api/webhooks/github/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "pull_request",
          "x-hub-signature-256": signBody(body, "wrong_secret"),
        },
        body,
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 when the signature header is missing", async () => {
    vi.resetModules();
    process.env.GITHUB_WEBHOOK_SECRET = "test_secret";
    handleInstallationWebhookSpy = vi.fn();
    handleInstallationRepositoriesWebhookSpy = vi.fn();
    handlePullRequestWebhookSpy = vi.fn();

    const body = JSON.stringify({ hello: "world" });

    const { POST } = await import("../app/api/webhooks/github/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "pull_request",
        },
        body,
      }),
    );

    expect(response.status).toBe(401);
  });
});
