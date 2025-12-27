import { spawnSync } from "node:child_process";
import path from "node:path";

const browsersPath = path.resolve(process.cwd(), ".playwright-browsers");
const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const extraArgs = process.argv.slice(2);

const args = ["exec", "playwright", "install"];
if (process.platform === "linux" && process.env.CI) args.push("--with-deps");
args.push("chromium");
args.push(...extraArgs);

const result = spawnSync(pnpmCmd, args, {
  stdio: "inherit",
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersPath },
});

process.exit(result.status ?? 1);
