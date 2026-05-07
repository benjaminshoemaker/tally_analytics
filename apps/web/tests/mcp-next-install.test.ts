import { describe, expect, it, vi } from "vitest";

let createOrReuseMcpProjectSpy: ReturnType<typeof vi.fn> | undefined;

vi.mock("../lib/db/queries/projects", () => ({
  createOrReuseMcpProject: (...args: unknown[]) => {
    if (!createOrReuseMcpProjectSpy) throw new Error("createOrReuseMcpProjectSpy not initialized");
    return createOrReuseMcpProjectSpy(...args);
  },
}));

function contextInput(overrides: Record<string, unknown> = {}) {
  return {
    repo: {
      name: "my-app",
      gitRemote: "git@github.com:user/my-app.git",
      workspaceRoot: ".",
      appRoot: ".",
      packageManager: "pnpm",
      dependencyTarget: "package.json",
    },
    framework: {
      kind: "nextjs-app-router",
      entrypoint: "app/layout.tsx",
      usesSrcDir: false,
      hasAtAlias: true,
    },
    files: {
      "package.json": JSON.stringify({ name: "my-app", dependencies: { next: "^14.0.0" } }),
      "app/layout.tsx": "export default function RootLayout() { return <html><body /></html>; }\n",
    },
    ...overrides,
  };
}

async function readyResult(input: unknown = contextInput()) {
  vi.resetModules();
  createOrReuseMcpProjectSpy = vi.fn().mockResolvedValue({
    status: "ready",
    projectId: "proj_existing",
    dashboardUrl: "https://usetally.xyz/projects/proj_existing",
    created: false,
    mcpFingerprint: "fingerprint",
  });

  const { prepareNextjsInstallPatch } = await import("../lib/mcp/next-install/prepare-nextjs-install-patch");
  return prepareNextjsInstallPatch({ userId: "user_1", input });
}

describe("MCP Next.js install service detection", () => {
  it("detects root App Router and src App Router targets", async () => {
    await expect(readyResult()).resolves.toMatchObject({
      status: "ready",
      target: {
        framework: "nextjs-app-router",
        router: "app",
        appRoot: ".",
        packageJsonPath: "package.json",
        entrypointPath: "app/layout.tsx",
        usesSrcDir: false,
      },
    });

    await expect(
      readyResult(
        contextInput({
          framework: { kind: "nextjs-app-router", entrypoint: "src/app/layout.tsx" },
          files: {
            "package.json": JSON.stringify({ dependencies: { next: "^14.0.0" } }),
            "src/app/layout.tsx": "export default function RootLayout() { return <html><body /></html>; }\n",
          },
        }),
      ),
    ).resolves.toMatchObject({
      status: "ready",
      target: { entrypointPath: "src/app/layout.tsx", usesSrcDir: true },
    });
  });

  it("detects root Pages Router and src Pages Router targets", async () => {
    await expect(
      readyResult(
        contextInput({
          framework: { kind: "nextjs-pages-router", entrypoint: "pages/_app.tsx" },
          files: {
            "package.json": JSON.stringify({ dependencies: { next: "^14.0.0" } }),
            "pages/_app.tsx": "export default function App({ Component, pageProps }) { return <Component {...pageProps} />; }\n",
          },
        }),
      ),
    ).resolves.toMatchObject({ status: "ready", target: { router: "pages", usesSrcDir: false } });

    await expect(
      readyResult(
        contextInput({
          framework: { kind: "nextjs-pages-router", entrypoint: "src/pages/_app.tsx" },
          files: {
            "package.json": JSON.stringify({ dependencies: { next: "^14.0.0" } }),
            "src/pages/_app.tsx": "export default function App({ Component, pageProps }) { return <Component {...pageProps} />; }\n",
          },
        }),
      ),
    ).resolves.toMatchObject({ status: "ready", target: { router: "pages", usesSrcDir: true } });
  });

  it("detects explicit monorepo app roots", async () => {
    await expect(
      readyResult(
        contextInput({
          repo: {
            name: "my-app",
            gitRemote: "git@github.com:user/my-app.git",
            workspaceRoot: ".",
            appRoot: "apps/web",
            packageManager: "pnpm",
            dependencyTarget: "apps/web/package.json",
          },
          framework: { kind: "nextjs-app-router", entrypoint: "apps/web/app/layout.tsx" },
          files: {
            "package.json": JSON.stringify({ workspaces: ["apps/*"] }),
            "apps/web/package.json": JSON.stringify({ name: "web", dependencies: { next: "^14.0.0" } }),
            "apps/web/app/layout.tsx": "export default function RootLayout() { return <html><body /></html>; }\n",
          },
        }),
      ),
    ).resolves.toMatchObject({
      status: "ready",
      target: {
        appRoot: "apps/web",
        packageJsonPath: "apps/web/package.json",
        packageName: "web",
      },
    });
  });

  it("returns structured non-ready results for unsupported or incomplete contexts", async () => {
    await expect(
      readyResult(
        contextInput({
          files: {
            "package.json": JSON.stringify({ dependencies: { react: "^18.0.0" } }),
            "app/layout.tsx": "export default function RootLayout() { return null; }\n",
          },
        }),
      ),
    ).resolves.toMatchObject({ status: "unsupported", reason: "unsupported_framework" });

    await expect(
      readyResult(contextInput({ files: { "app/layout.tsx": "export default function RootLayout() { return null; }\n" } })),
    ).resolves.toMatchObject({ status: "needs_context", missingFiles: ["package.json"] });

    await expect(
      readyResult(contextInput({ files: { "package.json": JSON.stringify({ dependencies: { next: "^14.0.0" } }) } })),
    ).resolves.toMatchObject({ status: "needs_context", missingFiles: ["app/layout.tsx"] });

    await expect(
      readyResult(
        contextInput({
          files: {
            "package.json": JSON.stringify({ dependencies: { next: "^14.0.0" } }),
            "apps/web/package.json": JSON.stringify({ dependencies: { next: "^14.0.0" } }),
            "app/layout.tsx": "export default function RootLayout() { return null; }\n",
          },
        }),
      ),
    ).resolves.toMatchObject({ status: "unsupported", reason: "ambiguous_app_root" });

    await expect(
      readyResult(
        contextInput({
          files: {
            "package.json": JSON.stringify({ dependencies: { next: "^14.0.0" } }),
            "app/layout.tsx": "export default function RootLayout() { return null; }\n",
            "pages/_app.tsx": "export default function App() { return null; }\n",
          },
        }),
      ),
    ).resolves.toMatchObject({ status: "unsupported", reason: "ambiguous_app_root" });
  });

  it("delegates remote project reuse and returns existing project URLs", async () => {
    vi.resetModules();
    createOrReuseMcpProjectSpy = vi.fn().mockResolvedValue({
      status: "ready",
      projectId: "proj_remote",
      dashboardUrl: "https://usetally.xyz/projects/proj_remote",
      created: false,
      mcpFingerprint: "fingerprint",
    });

    const { prepareNextjsInstallPatch } = await import("../lib/mcp/next-install/prepare-nextjs-install-patch");
    await expect(prepareNextjsInstallPatch({ userId: "user_1", input: contextInput() })).resolves.toMatchObject({
      status: "ready",
      projectId: "proj_remote",
      dashboardUrl: "https://usetally.xyz/projects/proj_remote",
      projectCreated: false,
    });
    expect(createOrReuseMcpProjectSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        repoName: "my-app",
        gitRemote: "git@github.com:user/my-app.git",
        appRoot: ".",
        framework: "nextjs-app-router",
        packageManager: "pnpm",
      }),
    );
  });

  it("delegates no-remote project reuse", async () => {
    vi.resetModules();
    createOrReuseMcpProjectSpy = vi.fn().mockResolvedValue({
      status: "ready",
      projectId: "proj_local",
      dashboardUrl: "https://usetally.xyz/projects/proj_local",
      created: false,
      mcpFingerprint: "fingerprint",
    });

    const { prepareNextjsInstallPatch } = await import("../lib/mcp/next-install/prepare-nextjs-install-patch");
    await expect(
      prepareNextjsInstallPatch({
        userId: "user_1",
        input: contextInput({
          repo: {
            name: "local-app",
            workspaceRoot: ".",
            appRoot: ".",
            packageManager: "npm",
            dependencyTarget: "package.json",
          },
        }),
      }),
    ).resolves.toMatchObject({
      status: "ready",
      projectId: "proj_local",
      dashboardUrl: "https://usetally.xyz/projects/proj_local",
    });
    expect(createOrReuseMcpProjectSpy).toHaveBeenCalledWith(expect.objectContaining({ gitRemote: undefined }));
  });

  it("returns unsupported for multiple project matches", async () => {
    vi.resetModules();
    createOrReuseMcpProjectSpy = vi.fn().mockResolvedValue({
      status: "unsupported",
      reason: "multiple_matching_projects",
      mcpFingerprint: "fingerprint",
    });

    const { prepareNextjsInstallPatch } = await import("../lib/mcp/next-install/prepare-nextjs-install-patch");
    await expect(prepareNextjsInstallPatch({ userId: "user_1", input: contextInput() })).resolves.toMatchObject({
      status: "unsupported",
      reason: "multiple_matching_projects",
    });
  });

  it("renders App Router SDK wrapper and inserts TallyAnalytics before body close", async () => {
    vi.resetModules();

    const { insertTallyIntoEntrypoint, renderTallyWrapper, resolveTallyWrapperPaths } = await import(
      "../lib/mcp/next-install/templates"
    );

    const target = {
      router: "app" as const,
      entrypointPath: "app/layout.tsx",
    };
    const paths = resolveTallyWrapperPaths(target);
    const wrapper = renderTallyWrapper({ router: "app", projectId: "proj_123" });
    const updatedEntrypoint = insertTallyIntoEntrypoint({
      target,
      wrapperImportPath: paths.wrapperImportPath,
      content: "export default function RootLayout({ children }) {\n  return <html><body>{children}</body></html>;\n}\n",
    });

    expect(paths.wrapperFilePath).toBe("components/tally-analytics.tsx");
    expect(wrapper).toContain("import { AnalyticsAppRouter, init } from '@tally-analytics/sdk';");
    expect(wrapper).toContain("init({ projectId: 'proj_123' });");
    expect(wrapper).toContain("export function TallyAnalytics()");
    expect(updatedEntrypoint).toContain("import { TallyAnalytics } from '../components/tally-analytics';");
    expect(updatedEntrypoint.indexOf("<TallyAnalytics />")).toBeLessThan(updatedEntrypoint.indexOf("</body>"));
  });

  it("renders Pages Router SDK wrapper and calls useTallyAnalytics inside the App function", async () => {
    vi.resetModules();

    const { insertTallyIntoEntrypoint, renderTallyWrapper, resolveTallyWrapperPaths } = await import(
      "../lib/mcp/next-install/templates"
    );

    const target = {
      router: "pages" as const,
      entrypointPath: "src/pages/_app.jsx",
    };
    const paths = resolveTallyWrapperPaths(target);
    const wrapper = renderTallyWrapper({ router: "pages", projectId: "proj_123" });
    const updatedEntrypoint = insertTallyIntoEntrypoint({
      target,
      wrapperImportPath: paths.wrapperImportPath,
      content: "export default function App({ Component, pageProps }) {\n  return <Component {...pageProps} />;\n}\n",
    });

    expect(paths.wrapperFilePath).toBe("src/components/tally-analytics.jsx");
    expect(wrapper).toContain("import { init, useAnalyticsPagesRouter } from '@tally-analytics/sdk';");
    expect(wrapper).toContain("export function useTallyAnalytics()");
    expect(wrapper).not.toContain(": string");
    expect(wrapper).not.toContain("React.");
    expect(updatedEntrypoint).toContain("import { useTallyAnalytics } from '../components/tally-analytics';");
    expect(updatedEntrypoint).toContain("useTallyAnalytics();");
    expect(updatedEntrypoint.indexOf("useTallyAnalytics();")).toBeLessThan(updatedEntrypoint.indexOf("return <Component"));
  });

  it("infers wrapper extension from TSX and JSX entrypoints", async () => {
    vi.resetModules();

    const { resolveTallyWrapperPaths } = await import("../lib/mcp/next-install/templates");

    expect(resolveTallyWrapperPaths({ entrypointPath: "apps/web/app/layout.tsx" }).wrapperFilePath).toBe(
      "apps/web/components/tally-analytics.tsx",
    );
    expect(resolveTallyWrapperPaths({ entrypointPath: "apps/web/app/layout.jsx" }).wrapperFilePath).toBe(
      "apps/web/components/tally-analytics.jsx",
    );
  });

  it("adds @tally-analytics/sdk to dependencies without touching other ranges or lockfiles", async () => {
    vi.resetModules();

    const { addTallySdkDependency, TALLY_SDK_PACKAGE } = await import("../lib/mcp/next-install/package-json");
    const result = addTallySdkDependency(
      JSON.stringify({
        scripts: { dev: "next dev" },
        dependencies: {
          next: "^14.2.0",
          react: "^18.3.1",
        },
        devDependencies: {
          typescript: "^5.7.2",
        },
      }),
    );
    const parsed = JSON.parse(result.content) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(result.changed).toBe(true);
    expect(parsed.dependencies.next).toBe("^14.2.0");
    expect(parsed.dependencies.react).toBe("^18.3.1");
    expect(parsed.dependencies[TALLY_SDK_PACKAGE]).toBe("^0.1.0");
    expect(parsed.devDependencies.typescript).toBe("^5.7.2");
    expect(result.content).not.toContain("pnpm-lock.yaml");
    expect(result.content).not.toContain("package-lock.json");
  });
});
