import { describe, expect, it } from "vitest";

import { normalizeOAuthScope } from "../lib/oauth/validation";

describe("MCP OAuth scope normalization", () => {
  it("accepts install-only scope", () => {
    expect(normalizeOAuthScope("mcp:install")).toBe("mcp:install");
  });

  it("accepts tasks-only scope", () => {
    expect(normalizeOAuthScope("mcp:tasks")).toBe("mcp:tasks");
  });

  it("accepts combined install and tasks scopes", () => {
    expect(normalizeOAuthScope("mcp:install mcp:tasks")).toBe("mcp:install mcp:tasks");
    expect(normalizeOAuthScope("mcp:tasks mcp:install")).toBe("mcp:install mcp:tasks");
  });

  it("rejects unsupported scopes", () => {
    expect(() => normalizeOAuthScope("analytics:read")).toThrow(/Unsupported OAuth scope/);
    expect(() => normalizeOAuthScope("mcp:install analytics:read")).toThrow(/Unsupported OAuth scope/);
  });

  it("defaults missing scope to install scope", () => {
    expect(normalizeOAuthScope(undefined)).toBe("mcp:install");
    expect(normalizeOAuthScope(null)).toBe("mcp:install");
    expect(normalizeOAuthScope("   ")).toBe("mcp:install");
  });
});
