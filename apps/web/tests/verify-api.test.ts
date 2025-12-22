import { describe, expect, it, vi } from "vitest";

let selectSpy: ReturnType<typeof vi.fn> | undefined;
let insertSpy: ReturnType<typeof vi.fn> | undefined;
let updateSpy: ReturnType<typeof vi.fn> | undefined;
let cookieSetSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/client", () => ({
  db: {
    select: (...args: unknown[]) => {
      if (!selectSpy) throw new Error("selectSpy not initialized");
      return selectSpy(...args);
    },
    insert: (...args: unknown[]) => {
      if (!insertSpy) throw new Error("insertSpy not initialized");
      return insertSpy(...args);
    },
    update: (...args: unknown[]) => {
      if (!updateSpy) throw new Error("updateSpy not initialized");
      return updateSpy(...args);
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: () => ({
    set: (...args: unknown[]) => {
      if (!cookieSetSpy) throw new Error("cookieSetSpy not initialized");
      return cookieSetSpy(...args);
    },
  }),
}));

describe("GET /api/auth/verify", () => {
  it("validates token, creates user/session, marks token used, and redirects to /dashboard", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    vi.resetModules();
    cookieSetSpy = vi.fn();

    const schema = await import("../lib/db/schema");

    const token = "a".repeat(64);
    const magicLinkId = "11111111-1111-1111-1111-111111111111";
    const userId = "22222222-2222-2222-2222-222222222222";
    const sessionId = "33333333-3333-3333-3333-333333333333";

    const magicLinkRow = {
      id: magicLinkId,
      email: "test@example.com",
      expiresAt: new Date("2025-01-01T00:15:00.000Z"),
      usedAt: null,
    };

    selectSpy = vi.fn(() => ({
      from: (table: unknown) => ({
        where: async () => {
          if (table === schema.magicLinks) return [magicLinkRow];
          if (table === schema.users) return [];
          return [];
        },
      }),
    }));

    const updateWhereSpy = vi.fn().mockResolvedValue(undefined);
    const updateSetSpy = vi.fn(() => ({ where: updateWhereSpy }));
    updateSpy = vi.fn(() => ({ set: updateSetSpy }));

    const userReturningSpy = vi.fn().mockResolvedValue([{ id: userId }]);
    const userValuesSpy = vi.fn(() => ({ returning: userReturningSpy }));

    const sessionReturningSpy = vi.fn().mockResolvedValue([
      { id: sessionId, userId, expiresAt: new Date("2025-01-31T00:00:00.000Z") },
    ]);
    const sessionValuesSpy = vi.fn(() => ({ returning: sessionReturningSpy }));

    insertSpy = vi.fn((table: unknown) => {
      if (table === schema.users) return { values: userValuesSpy };
      if (table === schema.sessions) return { values: sessionValuesSpy };
      throw new Error("Unexpected insert table");
    });

    const { SESSION_COOKIE_NAME } = await import("../lib/auth/cookies");
    const { GET } = await import("../app/api/auth/verify/route");

    const response = await GET(new Request(`http://localhost/api/auth/verify?token=${token}`));

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);

    const location = response.headers.get("location");
    expect(location).toBeTruthy();
    const redirectUrl = new URL(location ?? "", "http://localhost");
    expect(redirectUrl.pathname).toBe("/dashboard");

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSetSpy).toHaveBeenCalledWith({ usedAt: expect.any(Date) });
    expect(updateWhereSpy).toHaveBeenCalledTimes(1);

    expect(userValuesSpy).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(cookieSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: SESSION_COOKIE_NAME,
        value: sessionId,
      }),
    );

    vi.useRealTimers();
  });

  it("creates a session for existing user and redirects to /dashboard", async () => {
    vi.resetModules();
    cookieSetSpy = vi.fn();

    const schema = await import("../lib/db/schema");

    const token = "b".repeat(64);
    const magicLinkId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const userId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const sessionId = "cccccccc-cccc-cccc-cccc-cccccccccccc";

    const magicLinkRow = {
      id: magicLinkId,
      email: "existing@example.com",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      usedAt: null,
    };

    selectSpy = vi.fn(() => ({
      from: (table: unknown) => ({
        where: async () => {
          if (table === schema.magicLinks) return [magicLinkRow];
          if (table === schema.users) return [{ id: userId }];
          return [];
        },
      }),
    }));

    const updateWhereSpy = vi.fn().mockResolvedValue(undefined);
    const updateSetSpy = vi.fn(() => ({ where: updateWhereSpy }));
    updateSpy = vi.fn(() => ({ set: updateSetSpy }));

    const sessionReturningSpy = vi.fn().mockResolvedValue([
      { id: sessionId, userId, expiresAt: new Date("2030-02-01T00:00:00.000Z") },
    ]);
    const sessionValuesSpy = vi.fn(() => ({ returning: sessionReturningSpy }));

    insertSpy = vi.fn((table: unknown) => {
      if (table === schema.sessions) return { values: sessionValuesSpy };
      if (table === schema.users) throw new Error("users insert should not be called");
      throw new Error("Unexpected insert table");
    });

    const { GET } = await import("../app/api/auth/verify/route");
    const response = await GET(new Request(`http://localhost/api/auth/verify?token=${token}`));
    const location = response.headers.get("location");
    expect(new URL(location ?? "", "http://localhost").pathname).toBe("/dashboard");
  });

  it("redirects to /login?error=invalid_token when token is missing or invalid", async () => {
    vi.resetModules();
    cookieSetSpy = vi.fn();

    const schema = await import("../lib/db/schema");

    selectSpy = vi.fn(() => ({
      from: (table: unknown) => ({
        where: async () => {
          if (table === schema.magicLinks) return [];
          return [];
        },
      }),
    }));

    updateSpy = vi.fn();
    insertSpy = vi.fn();

    const { GET } = await import("../app/api/auth/verify/route");

    const response = await GET(new Request("http://localhost/api/auth/verify"));
    const location = response.headers.get("location");
    expect(new URL(location ?? "", "http://localhost").pathname).toBe("/login");
    expect(new URL(location ?? "", "http://localhost").searchParams.get("error")).toBe("invalid_token");
  });

  it("redirects to /login?error=expired_token when token is expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    vi.resetModules();
    cookieSetSpy = vi.fn();

    const schema = await import("../lib/db/schema");

    const token = "c".repeat(64);
    const magicLinkRow = {
      id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      email: "expired@example.com",
      expiresAt: new Date("2024-12-31T23:59:59.000Z"),
      usedAt: null,
    };

    selectSpy = vi.fn(() => ({
      from: (table: unknown) => ({
        where: async () => {
          if (table === schema.magicLinks) return [magicLinkRow];
          return [];
        },
      }),
    }));

    updateSpy = vi.fn();
    insertSpy = vi.fn();

    const { GET } = await import("../app/api/auth/verify/route");
    const response = await GET(new Request(`http://localhost/api/auth/verify?token=${token}`));
    const location = response.headers.get("location");
    expect(new URL(location ?? "", "http://localhost").pathname).toBe("/login");
    expect(new URL(location ?? "", "http://localhost").searchParams.get("error")).toBe("expired_token");

    vi.useRealTimers();
  });
});

