import { spawnSync } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

const browsersPath = path.resolve(process.cwd(), ".playwright-browsers");

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const extraArgs = process.argv.slice(2);

function playwrightHostPlatformOverride() {
  if (process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE) return undefined;
  if (process.platform !== "darwin") return undefined;
  if (process.arch !== "arm64") return undefined;

  const darwinMajor = Number.parseInt(os.release().split(".")[0] ?? "", 10);
  if (!Number.isFinite(darwinMajor)) return undefined;

  const hasAppleCpuModel = os.cpus().some((cpu) => typeof cpu.model === "string" && cpu.model.includes("Apple"));
  if (hasAppleCpuModel) return undefined;

  const LAST_STABLE_MACOS_MAJOR_VERSION = 15;
  const macMajor = Math.min(darwinMajor - 9, LAST_STABLE_MACOS_MAJOR_VERSION);
  return `mac${macMajor}-arm64`;
}

function hasExpectedChromiumHeadlessShell({ browsersPath }) {
  if (process.platform !== "darwin") return true;

  const expectedShellDir = process.arch === "arm64" ? "chrome-headless-shell-mac-arm64" : "chrome-headless-shell-mac-x64";
  try {
    const entries = fs.readdirSync(browsersPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!entry.name.startsWith("chromium_headless_shell-")) continue;
      const candidate = path.join(browsersPath, entry.name, expectedShellDir, "chrome-headless-shell");
      if (fs.existsSync(candidate)) return true;
    }
  } catch {
    // ignore
  }

  return false;
}

if (!hasExpectedChromiumHeadlessShell({ browsersPath })) {
  const hostPlatformOverride = playwrightHostPlatformOverride();
  const installResult = spawnSync(process.execPath, ["./scripts/playwright-install.mjs"], {
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: browsersPath,
      ...(hostPlatformOverride ? { PLAYWRIGHT_HOST_PLATFORM_OVERRIDE: hostPlatformOverride } : {}),
    },
  });

  if ((installResult.status ?? 1) !== 0 || !hasExpectedChromiumHeadlessShell({ browsersPath })) {
    process.exit(installResult.status ?? 1);
  }
}

const hostPlatformOverride = playwrightHostPlatformOverride();
const result = spawnSync(pnpmCmd, ["exec", "playwright", "test", ...extraArgs], {
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: browsersPath,
    ...(hostPlatformOverride ? { PLAYWRIGHT_HOST_PLATFORM_OVERRIDE: hostPlatformOverride } : {}),
  },
});

process.exit(result.status ?? 1);
