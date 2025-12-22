import { describe, expect, it, vi } from "vitest";

let emailsSendSpy: ReturnType<typeof vi.fn> | undefined;
let capturedApiKey: string | undefined;

vi.mock("resend", () => ({
  Resend: class Resend {
    emails: { send: (...args: unknown[]) => unknown };
    constructor(apiKey: string) {
      capturedApiKey = apiKey;
      this.emails = {
        send: (...args: unknown[]) => {
          if (!emailsSendSpy) throw new Error("emailsSendSpy not initialized");
          return emailsSendSpy(...args);
        },
      };
    }
  },
}));

describe("sendMagicLinkEmail", () => {
  it("throws when RESEND_API_KEY is missing", async () => {
    const previousApiKey = process.env.RESEND_API_KEY;
    const previousFromEmail = process.env.FROM_EMAIL;
    delete process.env.RESEND_API_KEY;
    process.env.FROM_EMAIL = "no-reply@example.com";

    vi.resetModules();
    const { sendMagicLinkEmail } = await import("../lib/email/send");

    await expect(sendMagicLinkEmail({ to: "test@example.com", loginUrl: "http://localhost/login" })).rejects.toThrow(
      /Missing required environment variable: RESEND_API_KEY/,
    );

    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousApiKey;
    if (previousFromEmail === undefined) delete process.env.FROM_EMAIL;
    else process.env.FROM_EMAIL = previousFromEmail;
  });

  it("throws when FROM_EMAIL is missing", async () => {
    const previousApiKey = process.env.RESEND_API_KEY;
    const previousFromEmail = process.env.FROM_EMAIL;
    process.env.RESEND_API_KEY = "rk_test";
    delete process.env.FROM_EMAIL;

    vi.resetModules();
    const { sendMagicLinkEmail } = await import("../lib/email/send");

    await expect(sendMagicLinkEmail({ to: "test@example.com", loginUrl: "http://localhost/login" })).rejects.toThrow(
      /Missing required environment variable: FROM_EMAIL/,
    );

    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousApiKey;
    if (previousFromEmail === undefined) delete process.env.FROM_EMAIL;
    else process.env.FROM_EMAIL = previousFromEmail;
  });

  it("sends an email via Resend with the expected fields", async () => {
    const previousApiKey = process.env.RESEND_API_KEY;
    const previousFromEmail = process.env.FROM_EMAIL;
    process.env.RESEND_API_KEY = "rk_test";
    process.env.FROM_EMAIL = "no-reply@example.com";

    vi.resetModules();
    emailsSendSpy = vi.fn().mockResolvedValue(undefined);
    capturedApiKey = undefined;

    const { sendMagicLinkEmail } = await import("../lib/email/send");
    const loginUrl = "http://localhost/api/auth/verify?token=abc";
    await sendMagicLinkEmail({ to: "test@example.com", loginUrl });

    expect(capturedApiKey).toBe("rk_test");
    expect(emailsSendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "no-reply@example.com",
        to: "test@example.com",
        subject: expect.any(String),
        html: expect.stringContaining(loginUrl),
      }),
    );

    if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousApiKey;
    if (previousFromEmail === undefined) delete process.env.FROM_EMAIL;
    else process.env.FROM_EMAIL = previousFromEmail;
  });
});

