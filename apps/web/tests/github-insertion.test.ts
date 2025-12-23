import { describe, expect, it } from "vitest";

describe("github analytics path resolution", () => {
  it("uses src/components when entry point is under src/", async () => {
    const { resolveAnalyticsPaths } = await import("../lib/github/templates/paths");
    expect(resolveAnalyticsPaths({ entryPointPath: "src/app/layout.tsx" })).toEqual({
      componentFilePath: "src/components/fast-pr-analytics.tsx",
      importPath: "../components/fast-pr-analytics",
    });
  });

  it("uses @ alias when tsconfig declares @/*", async () => {
    const { resolveAnalyticsPaths, hasAtAlias } = await import("../lib/github/templates/paths");
    expect(hasAtAlias({ compilerOptions: { paths: { "@/*": ["./src/*"] } } })).toBe(true);
    expect(resolveAnalyticsPaths({ entryPointPath: "src/app/layout.tsx", useAtAlias: true })).toEqual({
      componentFilePath: "src/components/fast-pr-analytics.tsx",
      importPath: "@/components/fast-pr-analytics",
    });
  });
});

describe("github analytics insertion", () => {
  it("inserts import and component into an App Router layout", async () => {
    const { insertAnalyticsIntoAppRouterLayout } = await import("../lib/github/templates/insert-analytics");

    const input = [
      "import './globals.css';",
      "",
      "export default function RootLayout({ children }: { children: React.ReactNode }) {",
      "  return (",
      "    <html lang=\"en\">",
      "      <body>",
      "        {children}",
      "      </body>",
      "    </html>",
      "  );",
      "}",
      "",
    ].join("\\n");

    const output = insertAnalyticsIntoAppRouterLayout({
      content: input,
      importPath: "../components/fast-pr-analytics",
      componentName: "FastPrAnalytics",
    });

    expect(output).toContain("import { FastPrAnalytics } from '../components/fast-pr-analytics';");
    expect(output).toContain("<FastPrAnalytics />");
    expect(output.indexOf("<FastPrAnalytics />")).toBeLessThan(output.indexOf("</body>"));
  });

  it("inserts import and hook call into a Pages Router _app", async () => {
    const { insertAnalyticsIntoPagesRouterApp } = await import("../lib/github/templates/insert-analytics");

    const input = [
      "import type { AppProps } from 'next/app';",
      "",
      "export default function App({ Component, pageProps }: AppProps) {",
      "  return <Component {...pageProps} />;",
      "}",
      "",
    ].join("\\n");

    const output = insertAnalyticsIntoPagesRouterApp({
      content: input,
      importPath: "./components/fast-pr-analytics",
      hookName: "useFastPrAnalytics",
    });

    expect(output).toContain("import { useFastPrAnalytics } from './components/fast-pr-analytics';");
    expect(output).toContain("useFastPrAnalytics();");
  });
});

