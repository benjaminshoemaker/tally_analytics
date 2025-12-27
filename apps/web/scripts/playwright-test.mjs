import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const browsersPath = path.resolve(process.cwd(), ".playwright-browsers");

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const extraArgs = process.argv.slice(2);

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
  const installResult = spawnSync(process.execPath, ["./scripts/playwright-install.mjs"], {
    stdio: "inherit",
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersPath },
  });

  if ((installResult.status ?? 1) !== 0 || !hasExpectedChromiumHeadlessShell({ browsersPath })) {
    process.exit(installResult.status ?? 1);
  }
}

const result = spawnSync(pnpmCmd, ["exec", "playwright", "test", ...extraArgs], {
  stdio: "inherit",
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersPath },
});

process.exit(result.status ?? 1);
