import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appDir, "..", "..");
const rootEnvPath = path.join(repoRoot, ".env.local");
const appEnvPath = path.join(appDir, ".env.local");

config({ path: rootEnvPath });

try {
  if (appEnvPath !== rootEnvPath) {
    config({ path: appEnvPath });
  }
} catch {
  // dotenv already reports parse/load failures where useful.
}

const args = ["dev"];
if (process.env.PORT) {
  args.push("-p", process.env.PORT);
}

const child = spawn("next", args, {
  cwd: appDir,
  env: process.env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exit(code ?? 0);
});
