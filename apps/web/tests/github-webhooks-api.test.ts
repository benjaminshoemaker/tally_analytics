import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";

let handleInstallationWebhookSpy: ReturnType<typeof vi.fn> | undefined;
let handleInstallationRepositoriesWebhookSpy: ReturnType<typeof vi.fn> | undefined;
let handlePullRequestWebhookSpy: ReturnType<typeof vi.fn> | undefined;
let handlePushWebhookSpy: ReturnType<typeof vi.fn> | undefined;

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

vi.mock("../lib/github/handlers/push", () => ({
  handlePushWebhook: (...args: unknown[]) => {
    if (!handlePushWebhookSpy) throw new Error("handlePushWebhookSpy not initialized");
    return handlePushWebhookSpy(...args);
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
    handlePushWebhookSpy = vi.fn();

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
    handlePushWebhookSpy = vi.fn();

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
    handlePushWebhookSpy = vi.fn();

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

  it("returns 400 for invalid JSON with a valid signature", async () => {
    vi.resetModules();
    process.env.GITHUB_WEBHOOK_SECRET = "test_secret";
    handleInstallationWebhookSpy = vi.fn();
    handleInstallationRepositoriesWebhookSpy = vi.fn();
    handlePullRequestWebhookSpy = vi.fn();
    handlePushWebhookSpy = vi.fn();

    const body = "{not_json";
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

    expect(response.status).toBe(400);
  });

  it("routes installation_repositories events to the correct handler", async () => {
    vi.resetModules();
    process.env.GITHUB_WEBHOOK_SECRET = "test_secret";
    handleInstallationWebhookSpy = vi.fn();
    handleInstallationRepositoriesWebhookSpy = vi.fn().mockResolvedValue(undefined);
    handlePullRequestWebhookSpy = vi.fn();
    handlePushWebhookSpy = vi.fn();

    const payload = { action: "added", installation: { id: 123 }, repositories_added: [{ id: 1, full_name: "octo/repo" }] };
    const body = JSON.stringify(payload);
    const signature = signBody(body, process.env.GITHUB_WEBHOOK_SECRET);

    const { POST } = await import("../app/api/webhooks/github/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "installation_repositories",
          "x-hub-signature-256": signature,
        },
        body,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, handledEvent: "installation_repositories" });
    expect(handleInstallationRepositoriesWebhookSpy).toHaveBeenCalledWith(payload);
  });

  it("routes push events to the correct handler", async () => {
    vi.resetModules();
    process.env.GITHUB_WEBHOOK_SECRET = "test_secret";
    handleInstallationWebhookSpy = vi.fn();
    handleInstallationRepositoriesWebhookSpy = vi.fn();
    handlePullRequestWebhookSpy = vi.fn();
    handlePushWebhookSpy = vi.fn().mockResolvedValue(undefined);

    const payload = { ref: "refs/heads/main", repository: { id: 1, full_name: "octo/repo", default_branch: "main" }, installation: { id: 2 } };
    const body = JSON.stringify(payload);
    const signature = signBody(body, process.env.GITHUB_WEBHOOK_SECRET);

    const { POST } = await import("../app/api/webhooks/github/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "push",
          "x-hub-signature-256": signature,
        },
        body,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, handledEvent: "push" });
    expect(handlePushWebhookSpy).toHaveBeenCalledWith(payload);
  });

  it("returns handledEvent=unknown for an unknown event", async () => {
    vi.resetModules();
    process.env.GITHUB_WEBHOOK_SECRET = "test_secret";
    handleInstallationWebhookSpy = vi.fn(() => {
      throw new Error("handleInstallationWebhook called unexpectedly");
    });
    handleInstallationRepositoriesWebhookSpy = vi.fn(() => {
      throw new Error("handleInstallationRepositoriesWebhook called unexpectedly");
    });
    handlePullRequestWebhookSpy = vi.fn(() => {
      throw new Error("handlePullRequestWebhook called unexpectedly");
    });
    handlePushWebhookSpy = vi.fn(() => {
      throw new Error("handlePushWebhook called unexpectedly");
    });

    const payload = { hello: "world" };
    const body = JSON.stringify(payload);
    const signature = signBody(body, process.env.GITHUB_WEBHOOK_SECRET);

    const { POST } = await import("../app/api/webhooks/github/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "some_unknown_event",
          "x-hub-signature-256": signature,
        },
        body,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, handledEvent: "unknown" });
  });
});
