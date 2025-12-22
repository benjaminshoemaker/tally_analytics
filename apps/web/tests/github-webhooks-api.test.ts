import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";

function signBody(body: string, secret: string): string {
  const digest = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

describe("POST /api/webhooks/github", () => {
  it("accepts a signed webhook and routes by event", async () => {
    vi.resetModules();
    process.env.GITHUB_WEBHOOK_SECRET = "test_secret";

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
  });

  it("returns 401 for an invalid signature", async () => {
    vi.resetModules();
    process.env.GITHUB_WEBHOOK_SECRET = "test_secret";

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

