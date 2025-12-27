import { spawnSync } from "node:child_process";
import path from "node:path";

const browsersPath = path.resolve(process.cwd(), ".playwright-browsers");

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const extraArgs = process.argv.slice(2);

const result = spawnSync(pnpmCmd, ["exec", "playwright", "test", ...extraArgs], {
  stdio: "inherit",
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersPath },
});

process.exit(result.status ?? 1);
