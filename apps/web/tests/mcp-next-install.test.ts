import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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
      "package.json": `${JSON.stringify({ name: "my-app", dependencies: { next: "^14.0.0" } })}\n`,
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

  it("infers package.json when an agent mistakes dependencyTarget for dependencies", async () => {
    await expect(
      readyResult(
        contextInput({
          repo: {
            name: "tally-pages-router-test-project",
            gitRemote: "https://github.com/benjaminshoemaker/tally-pages-router-test-project.git",
            workspaceRoot: ".",
            appRoot: ".",
            packageManager: "pnpm",
            dependencyTarget: "dependencies",
          },
          framework: {
            kind: "nextjs-pages-router",
            entrypoint: "src/pages/_app.tsx",
            usesSrcDir: true,
            hasAtAlias: true,
          },
          files: {
            "package.json": JSON.stringify({
              name: "tally-pages-router-test-project",
              dependencies: { next: "16.1.1", react: "19.2.3", "react-dom": "19.2.3" },
            }),
            "src/pages/_app.tsx": "export default function App({ Component, pageProps }) { return <Component {...pageProps} />; }\n",
          },
        }),
      ),
    ).resolves.toMatchObject({
      status: "ready",
      target: {
        router: "pages",
        packageJsonPath: "package.json",
        entrypointPath: "src/pages/_app.tsx",
      },
    });
  });

  it("accepts explicit packageJsonPath without the deprecated dependencyTarget field", async () => {
    await expect(
      readyResult(
        contextInput({
          repo: {
            name: "my-app",
            gitRemote: "git@github.com:user/my-app.git",
            workspaceRoot: ".",
            appRoot: ".",
            packageManager: "pnpm",
            packageJsonPath: "package.json",
          },
        }),
      ),
    ).resolves.toMatchObject({ status: "ready", target: { packageJsonPath: "package.json" } });
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

  it("returns ready patch contract and a git-applyable unified diff for ready fixtures", async () => {
    const result = await readyResult();
    expect(result).toMatchObject({
      status: "ready",
      projectId: "proj_existing",
      patchFormat: "unified_diff_v1",
      filesChanged: ["package.json", "components/tally-analytics.tsx", "app/layout.tsx"],
      packageInstallCommand: "pnpm install",
    });
    if (result.status !== "ready") throw new Error("Expected ready result");
    expect(result.unifiedDiff).toContain("diff --git a/package.json b/package.json");
    expect(result.unifiedDiff).toContain("new file mode 100644");
    expect(result.unifiedDiff).toContain("@@");
    expect(result.verification).toContain("Apply the unified diff with git apply --check before git apply.");
    expect(result.verification).toContain("Run pnpm install. Do not substitute another package manager.");

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-next-install-"));
    fs.mkdirSync(path.join(tempDir, "app"), { recursive: true });
    fs.writeFileSync(path.join(tempDir, "package.json"), contextInput().files["package.json"]);
    fs.writeFileSync(path.join(tempDir, "app/layout.tsx"), contextInput().files["app/layout.tsx"]);
    execFileSync("git", ["init"], { cwd: tempDir, stdio: "ignore" });
    execFileSync("git", ["apply", "--check"], { cwd: tempDir, input: result.unifiedDiff });
  });

  it("creates the required fixture matrix directories", () => {
    const base = path.join(__dirname, "fixtures", "mcp-nextjs");
    for (const fixture of [
      "app-router-root",
      "pages-router-root",
      "app-router-src",
      "pages-router-src",
      "app-router-jsx",
      "pages-router-jsx",
      "non-next",
      "ambiguous-monorepo",
      "already-installed",
      "existing-conflict",
    ]) {
      expect(fs.statSync(path.join(base, fixture)).isDirectory()).toBe(true);
    }
  });

  it("returns already_installed when submitted files already match the project", async () => {
    vi.resetModules();
    createOrReuseMcpProjectSpy = vi.fn().mockResolvedValue({
      status: "ready",
      projectId: "proj_existing",
      dashboardUrl: "https://usetally.xyz/projects/proj_existing",
      created: false,
      mcpFingerprint: "fingerprint",
    });

    const { renderTallyWrapper } = await import("../lib/mcp/next-install/templates");
    const { prepareNextjsInstallPatch } = await import("../lib/mcp/next-install/prepare-nextjs-install-patch");
    const input = contextInput({
      files: {
        "package.json": JSON.stringify({
          dependencies: { next: "^14.0.0", "@tally-analytics/sdk": "^0.1.0" },
        }),
        "app/layout.tsx":
          "import { TallyAnalytics } from '../components/tally-analytics';\nexport default function RootLayout() { return <html><body><TallyAnalytics /></body></html>; }\n",
        "components/tally-analytics.tsx": renderTallyWrapper({ router: "app", projectId: "proj_existing" }),
      },
    });

    await expect(prepareNextjsInstallPatch({ userId: "user_1", input })).resolves.toEqual({
      status: "already_installed",
      projectId: "proj_existing",
      dashboardUrl: "https://usetally.xyz/projects/proj_existing",
      unifiedDiff: "",
    });
  });

  it("returns existing_integration_conflict when Tally files do not match the current project", async () => {
    vi.resetModules();
    createOrReuseMcpProjectSpy = vi.fn().mockResolvedValue({
      status: "ready",
      projectId: "proj_current",
      dashboardUrl: "https://usetally.xyz/projects/proj_current",
      created: false,
      mcpFingerprint: "fingerprint",
    });

    const { prepareNextjsInstallPatch } = await import("../lib/mcp/next-install/prepare-nextjs-install-patch");
    await expect(
      prepareNextjsInstallPatch({
        userId: "user_1",
        input: contextInput({
          files: {
            "package.json": JSON.stringify({
              dependencies: { next: "^14.0.0", "@tally-analytics/sdk": "^0.1.0" },
            }),
            "app/layout.tsx": "export default function RootLayout() { return <html><body /></html>; }\n",
          },
        }),
      }),
    ).resolves.toMatchObject({ status: "unsupported", reason: "existing_integration_conflict" });
  });

  it("ready diffs only include package JSON, wrapper file, and selected entrypoint", async () => {
    const result = await readyResult();
    if (result.status !== "ready") throw new Error("Expected ready result");
    expect(result.filesChanged).toEqual(["package.json", "components/tally-analytics.tsx", "app/layout.tsx"]);
    expect(result.unifiedDiff).not.toContain("pnpm-lock.yaml");
    expect(result.unifiedDiff).not.toContain("README.md");
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
    expect(wrapper).toContain("projectId: 'proj_123'");
    expect(wrapper).toContain("eventsUrl: process.env.NEXT_PUBLIC_TALLY_EVENTS_URL");
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
    expect(wrapper).toContain("projectId: 'proj_123'");
    expect(wrapper).toContain("eventsUrl: process.env.NEXT_PUBLIC_TALLY_EVENTS_URL");
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
