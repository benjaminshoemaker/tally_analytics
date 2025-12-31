import { describe, expect, it, vi } from "vitest";

let getUserFromRequestSpy: ReturnType<typeof vi.fn> | undefined;
let selectSpy: ReturnType<typeof vi.fn> | undefined;
let countRecentRegenerateRequestsSpy: ReturnType<typeof vi.fn> | undefined;
let createRegenerateRequestSpy: ReturnType<typeof vi.fn> | undefined;
let analyzeRepositorySpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/auth/get-user", () => ({
  getUserFromRequest: (...args: unknown[]) => {
    if (!getUserFromRequestSpy) throw new Error("getUserFromRequestSpy not initialized");
    return getUserFromRequestSpy(...args);
  },
}));

vi.mock("../lib/db/client", () => ({
  db: {
    select: (...args: unknown[]) => {
      if (!selectSpy) throw new Error("selectSpy not initialized");
      return selectSpy(...args);
    },
  },
}));

vi.mock("../lib/db/queries/regenerate-requests", () => ({
  countRecentRegenerateRequests: (...args: unknown[]) => {
    if (!countRecentRegenerateRequestsSpy) throw new Error("countRecentRegenerateRequestsSpy not initialized");
    return countRecentRegenerateRequestsSpy(...args);
  },
  createRegenerateRequest: (...args: unknown[]) => {
    if (!createRegenerateRequestSpy) throw new Error("createRegenerateRequestSpy not initialized");
    return createRegenerateRequestSpy(...args);
  },
}));

vi.mock("../lib/github/analyze", () => ({
  analyzeRepository: (...args: unknown[]) => {
    if (!analyzeRepositorySpy) throw new Error("analyzeRepositorySpy not initialized");
    return analyzeRepositorySpy(...args);
  },
}));

describe("POST /api/projects/[id]/regenerate", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.resetModules();

    getUserFromRequestSpy = vi.fn().mockResolvedValue(null);
    selectSpy = vi.fn();
    countRecentRegenerateRequestsSpy = vi.fn();
    createRegenerateRequestSpy = vi.fn();
    analyzeRepositorySpy = vi.fn();

    const { POST } = await import("../app/api/projects/[id]/regenerate/route");

    const response = await POST(new Request("http://localhost/api/projects/proj_123/regenerate", { method: "POST" }), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when project is not found", async () => {
    vi.resetModules();

    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const whereSpy = vi.fn().mockResolvedValue([]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    countRecentRegenerateRequestsSpy = vi.fn();
    createRegenerateRequestSpy = vi.fn();
    analyzeRepositorySpy = vi.fn();

    const { POST } = await import("../app/api/projects/[id]/regenerate/route");

    const response = await POST(new Request("http://localhost/api/projects/proj_123/regenerate", { method: "POST" }), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(404);
  });

  it("returns 400 when project status is not eligible", async () => {
    vi.resetModules();

    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const whereSpy = vi.fn().mockResolvedValue([
      {
        id: "proj_123",
        status: "pr_pending",
        repoId: 1n,
        repoFullName: "octo/repo",
        installationId: 2n,
      },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    countRecentRegenerateRequestsSpy = vi.fn();
    createRegenerateRequestSpy = vi.fn();
    analyzeRepositorySpy = vi.fn();

    const { POST } = await import("../app/api/projects/[id]/regenerate/route");

    const response = await POST(new Request("http://localhost/api/projects/proj_123/regenerate", { method: "POST" }), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    vi.resetModules();

    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const whereSpy = vi.fn().mockResolvedValue([
      {
        id: "proj_123",
        status: "analysis_failed",
        repoId: 1n,
        repoFullName: "octo/repo",
        installationId: 2n,
      },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    countRecentRegenerateRequestsSpy = vi.fn().mockResolvedValue(1);
    createRegenerateRequestSpy = vi.fn();
    analyzeRepositorySpy = vi.fn();

    const { POST } = await import("../app/api/projects/[id]/regenerate/route");

    const response = await POST(new Request("http://localhost/api/projects/proj_123/regenerate", { method: "POST" }), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(429);
    expect(createRegenerateRequestSpy).not.toHaveBeenCalled();
    expect(analyzeRepositorySpy).not.toHaveBeenCalled();
  });

  it("records a regenerate request and triggers analysis", async () => {
    vi.resetModules();

    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const whereSpy = vi.fn().mockResolvedValue([
      {
        id: "proj_123",
        status: "analysis_failed",
        repoId: 1n,
        repoFullName: "octo/repo",
        installationId: 2n,
      },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    countRecentRegenerateRequestsSpy = vi.fn().mockResolvedValue(0);
    createRegenerateRequestSpy = vi.fn().mockResolvedValue(undefined);
    analyzeRepositorySpy = vi.fn().mockResolvedValue(undefined);

    const { POST } = await import("../app/api/projects/[id]/regenerate/route");

    const response = await POST(new Request("http://localhost/api/projects/proj_123/regenerate", { method: "POST" }), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, message: expect.any(String) });
    expect(createRegenerateRequestSpy).toHaveBeenCalledWith({ userId: "u1", projectId: "proj_123" });
    expect(analyzeRepositorySpy).toHaveBeenCalledWith({ repoId: 1n, repoFullName: "octo/repo", installationId: 2n });
  });

  it("allows regeneration for unsupported projects", async () => {
    vi.resetModules();

    getUserFromRequestSpy = vi.fn().mockResolvedValue({ id: "u1", email: "u1@example.com" });
    const whereSpy = vi.fn().mockResolvedValue([
      {
        id: "proj_123",
        status: "unsupported",
        repoId: 1n,
        repoFullName: "octo/repo",
        installationId: 2n,
      },
    ]);
    const fromSpy = vi.fn(() => ({ where: whereSpy }));
    selectSpy = vi.fn(() => ({ from: fromSpy }));

    countRecentRegenerateRequestsSpy = vi.fn().mockResolvedValue(0);
    createRegenerateRequestSpy = vi.fn().mockResolvedValue(undefined);
    analyzeRepositorySpy = vi.fn().mockResolvedValue(undefined);

    const { POST } = await import("../app/api/projects/[id]/regenerate/route");

    const response = await POST(new Request("http://localhost/api/projects/proj_123/regenerate", { method: "POST" }), {
      params: { id: "proj_123" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, message: expect.any(String) });
    expect(createRegenerateRequestSpy).toHaveBeenCalledWith({ userId: "u1", projectId: "proj_123" });
    expect(analyzeRepositorySpy).toHaveBeenCalledWith({ repoId: 1n, repoFullName: "octo/repo", installationId: 2n });
  });
});

