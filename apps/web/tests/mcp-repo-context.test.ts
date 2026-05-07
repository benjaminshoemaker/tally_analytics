import { describe, expect, it, vi } from "vitest";

function appRouterInput(overrides: Record<string, unknown> = {}) {
  return {
    repo: {
      name: "my-app",
      gitRemote: "git@github.com:user/my-app.git",
      workspaceRoot: ".",
      appRoot: "apps/web",
      packageManager: "pnpm",
      dependencyTarget: "apps/web/package.json",
    },
    framework: {
      kind: "nextjs-app-router",
      entrypoint: "apps/web/app/layout.tsx",
      usesSrcDir: false,
      hasAtAlias: true,
    },
    files: {
      "apps/web/package.json": JSON.stringify({ dependencies: { next: "^14.0.0" } }),
      "apps/web/tsconfig.json": "{}",
      "apps/web/app/layout.tsx": "export default function RootLayout({ children }) {\r\n  return <html><body>{children}</body></html>;\r\n}\r\n",
    },
    ...overrides,
  };
}

describe("MCP repo context validation", () => {
  it("accepts a minimal App Router context and normalizes file content to LF", async () => {
    vi.resetModules();

    const { validateRepoContext } = await import("../lib/mcp/next-install/context");
    const result = validateRepoContext(appRouterInput());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.context.packageJsonPath).toBe("apps/web/package.json");
    expect(result.context.entrypointPath).toBe("apps/web/app/layout.tsx");
    expect(result.context.files["apps/web/app/layout.tsx"]).not.toContain("\r");
  });

  it("accepts a minimal Pages Router context", async () => {
    vi.resetModules();

    const { validateRepoContext } = await import("../lib/mcp/next-install/context");
    const result = validateRepoContext(
      appRouterInput({
        framework: {
          kind: "nextjs-pages-router",
          entrypoint: "pages/_app.tsx",
        },
        repo: {
          name: "my-app",
          workspaceRoot: ".",
          appRoot: ".",
          packageManager: "npm",
          dependencyTarget: "package.json",
        },
        files: {
          "package.json": JSON.stringify({ dependencies: { next: "^14.0.0" } }),
          "pages/_app.tsx": "export default function App({ Component, pageProps }) { return <Component {...pageProps} />; }\n",
        },
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.context.repo.appRoot).toBe(".");
  });

  it("accepts TSX and JSX Next.js entrypoints but rejects unsupported entrypoint extensions", async () => {
    vi.resetModules();

    const { validateRepoContext } = await import("../lib/mcp/next-install/context");

    expect(
      validateRepoContext(
        appRouterInput({
          framework: {
            kind: "nextjs-app-router",
            entrypoint: "apps/web/app/layout.jsx",
          },
          files: {
            "apps/web/package.json": "{}",
            "apps/web/app/layout.jsx": "export default function RootLayout() { return <html><body /></html>; }\n",
          },
        }),
      ).ok,
    ).toBe(true);

    const jsResult = validateRepoContext(
      appRouterInput({
        framework: {
          kind: "nextjs-app-router",
          entrypoint: "apps/web/app/layout.js",
        },
        files: {
          "apps/web/package.json": "{}",
          "apps/web/app/layout.js": "export default function RootLayout() { return null; }\n",
        },
      }),
    );
    expect(jsResult).toMatchObject({ ok: false, reason: "unsupported_framework" });
  });

  it("rejects disallowed files, unsafe paths, binary content, and credentials", async () => {
    vi.resetModules();

    const { validateRepoContext } = await import("../lib/mcp/next-install/context");
    const invalidCases: Array<[string, unknown]> = [
      ["env file", appRouterInput({ files: { ...appRouterInput().files, "apps/web/.env.local": "SECRET=1" } })],
      ["lockfile", appRouterInput({ files: { ...appRouterInput().files, "apps/web/pnpm-lock.yaml": "lockfile" } })],
      ["private key", appRouterInput({ files: { ...appRouterInput().files, "apps/web/tally.private-key.pem": "key" } })],
      ["credentials", appRouterInput({ files: { ...appRouterInput().files, "apps/web/credentials.json": "{}" } })],
      ["absolute path", appRouterInput({ repo: { ...appRouterInput().repo, dependencyTarget: "/apps/web/package.json" } })],
      ["traversal path", appRouterInput({ framework: { ...appRouterInput().framework, entrypoint: "apps/web/../app/layout.tsx" } })],
      ["URL path", appRouterInput({ files: { ...appRouterInput().files, "https://example.com/package.json": "{}" } })],
      ["Windows path", appRouterInput({ files: { ...appRouterInput().files, "C:\\repo\\package.json": "{}" } })],
      ["unrelated file", appRouterInput({ files: { ...appRouterInput().files, "apps/web/README.md": "hello" } })],
      ["binary content", appRouterInput({ files: { ...appRouterInput().files, "apps/web/next.config.js": "\u0000" } })],
    ];

    for (const [, input] of invalidCases) {
      expect(validateRepoContext(input)).toMatchObject({ ok: false, reason: "disallowed_file" });
    }
  });

  it("rejects missing package or entrypoint files", async () => {
    vi.resetModules();

    const { validateRepoContext } = await import("../lib/mcp/next-install/context");

    expect(
      validateRepoContext(
        appRouterInput({
          files: {
            "apps/web/app/layout.tsx": "export default function RootLayout() { return null; }\n",
          },
        }),
      ),
    ).toMatchObject({ ok: false, reason: "missing_package_json" });

    expect(
      validateRepoContext(
        appRouterInput({
          files: {
            "apps/web/package.json": "{}",
          },
        }),
      ),
    ).toMatchObject({ ok: false, reason: "missing_entrypoint" });
  });

  it("rejects per-file and total request size limit violations", async () => {
    vi.resetModules();

    const { validateRepoContext } = await import("../lib/mcp/next-install/context");
    const tooLargeFile = "a".repeat(64 * 1024 + 1);
    expect(
      validateRepoContext(
        appRouterInput({
          files: {
            ...appRouterInput().files,
            "apps/web/next.config.js": tooLargeFile,
          },
        }),
      ),
    ).toMatchObject({ ok: false, reason: "request_too_large" });

    const largeAllowedFile = "a".repeat(60 * 1024);
    expect(
      validateRepoContext(
        appRouterInput({
          files: {
            "apps/web/package.json": largeAllowedFile,
            "apps/web/app/layout.tsx": largeAllowedFile,
            "apps/web/tsconfig.json": largeAllowedFile,
            "apps/web/jsconfig.json": largeAllowedFile,
            "apps/web/next.config.js": largeAllowedFile,
          },
        }),
      ),
    ).toMatchObject({ ok: false, reason: "request_too_large" });
  });
});
