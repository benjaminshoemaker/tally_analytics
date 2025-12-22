import { describe, expect, it, vi } from "vitest";

let createMagicLinkSpy: ReturnType<typeof vi.fn> | undefined;
let countRecentMagicLinksSpy: ReturnType<typeof vi.fn> | undefined;
let sendMagicLinkEmailSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/auth/magic-link", () => ({
  createMagicLink: (...args: unknown[]) => {
    if (!createMagicLinkSpy) throw new Error("createMagicLinkSpy not initialized");
    return createMagicLinkSpy(...args);
  },
  countRecentMagicLinks: (...args: unknown[]) => {
    if (!countRecentMagicLinksSpy) throw new Error("countRecentMagicLinksSpy not initialized");
    return countRecentMagicLinksSpy(...args);
  },
}));

vi.mock("../lib/email/send", () => ({
  sendMagicLinkEmail: (...args: unknown[]) => {
    if (!sendMagicLinkEmailSpy) throw new Error("sendMagicLinkEmailSpy not initialized");
    return sendMagicLinkEmailSpy(...args);
  },
}));

describe("POST /api/auth/magic-link", () => {
  it("validates email, creates magic link, sends email, and returns success", async () => {
    vi.resetModules();
    countRecentMagicLinksSpy = vi.fn().mockResolvedValue(0);
    createMagicLinkSpy = vi.fn().mockResolvedValue("http://localhost:3000/api/auth/verify?token=abc");
    sendMagicLinkEmailSpy = vi.fn().mockResolvedValue(undefined);

    const { POST } = await import("../app/api/auth/magic-link/route");

    const response = await POST(
      new Request("http://localhost/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "TeSt@Example.COM" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, message: expect.any(String) });

    expect(countRecentMagicLinksSpy).toHaveBeenCalledWith("test@example.com", expect.any(Date));
    expect(createMagicLinkSpy).toHaveBeenCalledWith("test@example.com");
    expect(sendMagicLinkEmailSpy).toHaveBeenCalledWith({
      to: "test@example.com",
      loginUrl: "http://localhost:3000/api/auth/verify?token=abc",
    });
  });

  it("returns 400 when email is invalid", async () => {
    vi.resetModules();
    countRecentMagicLinksSpy = vi.fn();
    createMagicLinkSpy = vi.fn();
    sendMagicLinkEmailSpy = vi.fn();

    const { POST } = await import("../app/api/auth/magic-link/route");

    const response = await POST(
      new Request("http://localhost/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("success", false);
    expect(createMagicLinkSpy).not.toHaveBeenCalled();
    expect(sendMagicLinkEmailSpy).not.toHaveBeenCalled();
  });

  it("rate limits to 3 requests per email per 15 minutes", async () => {
    vi.resetModules();
    countRecentMagicLinksSpy = vi.fn().mockResolvedValue(3);
    createMagicLinkSpy = vi.fn();
    sendMagicLinkEmailSpy = vi.fn();

    const { POST } = await import("../app/api/auth/magic-link/route");

    const response = await POST(
      new Request("http://localhost/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, message: expect.any(String) });
    expect(createMagicLinkSpy).not.toHaveBeenCalled();
    expect(sendMagicLinkEmailSpy).not.toHaveBeenCalled();
  });
});

