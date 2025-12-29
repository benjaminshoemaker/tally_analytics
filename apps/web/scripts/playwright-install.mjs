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

function removeMismatchedMacBrowserRevisions({ browsersPath, isDryRun }) {
  if (process.platform !== "darwin") return;
  if (isDryRun) return;

  const expectedChromiumDir = process.arch === "arm64" ? "chrome-mac-arm64" : "chrome-mac-x64";
  const expectedShellDir = process.arch === "arm64" ? "chrome-headless-shell-mac-arm64" : "chrome-headless-shell-mac-x64";

  let entries = [];
  try {
    entries = fs.readdirSync(browsersPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith("chromium-") && !entry.name.startsWith("chromium_headless_shell-")) continue;

    const revisionPath = path.join(browsersPath, entry.name);
    const expectedDir = entry.name.startsWith("chromium_headless_shell-") ? expectedShellDir : expectedChromiumDir;
    if (fs.existsSync(path.join(revisionPath, expectedDir))) continue;

    fs.rmSync(revisionPath, { recursive: true, force: true });
  }
}

const isDryRun = extraArgs.includes("--dry-run");
removeMismatchedMacBrowserRevisions({ browsersPath, isDryRun });

const args = ["exec", "playwright", "install"];
if (process.platform === "linux" && process.env.CI) args.push("--with-deps");
args.push("chromium");
args.push(...extraArgs);

const hostPlatformOverride = playwrightHostPlatformOverride();
const result = spawnSync(pnpmCmd, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: browsersPath,
    ...(hostPlatformOverride ? { PLAYWRIGHT_HOST_PLATFORM_OVERRIDE: hostPlatformOverride } : {}),
  },
});

process.exit(result.status ?? 1);
