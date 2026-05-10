import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootEnvPath = path.join(repoRoot, ".env.local");
const appEnvPaths = [
  path.join(repoRoot, "apps", "web", ".env.local"),
  path.join(repoRoot, "apps", "events", ".env.local"),
];
const requiredRootKeys = ["DATABASE_URL", "NEXT_PUBLIC_APP_URL"];

function relative(filePath) {
  return path.relative(repoRoot, filePath) || ".";
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return new Map();

  const entries = new Map();
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    entries.set(match[1], value);
  }
  return entries;
}

function valueHash(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function isSymlinkToRoot(filePath) {
  if (!fs.existsSync(filePath)) return true;
  const stat = fs.lstatSync(filePath);
  if (!stat.isSymbolicLink()) return false;
  return path.resolve(path.dirname(filePath), fs.readlinkSync(filePath)) === rootEnvPath;
}

function appUrlPort(env) {
  const appUrl = env.get("NEXT_PUBLIC_APP_URL");
  if (!appUrl) return null;

  try {
    return new URL(appUrl).port;
  } catch {
    return null;
  }
}

const issues = [];
const rootEnv = parseEnvFile(rootEnvPath);

if (!fs.existsSync(rootEnvPath)) {
  issues.push("Missing root .env.local. Use it as the canonical local env file.");
}

for (const key of requiredRootKeys) {
  if (!rootEnv.has(key) || rootEnv.get(key) === "") {
    issues.push(`Root .env.local is missing ${key}.`);
  }
}

const port = rootEnv.get("PORT");
const urlPort = appUrlPort(rootEnv);
if (port && urlPort && port !== urlPort) {
  issues.push(`PORT and NEXT_PUBLIC_APP_URL disagree: PORT=${port}, NEXT_PUBLIC_APP_URL port=${urlPort}.`);
}

for (const appEnvPath of appEnvPaths) {
  if (!fs.existsSync(appEnvPath)) continue;

  if (!isSymlinkToRoot(appEnvPath)) {
    const appEnv = parseEnvFile(appEnvPath);
    const differingKeys = [];
    for (const [key, appValue] of appEnv) {
      const rootValue = rootEnv.get(key);
      if (rootValue !== undefined && valueHash(rootValue) !== valueHash(appValue)) differingKeys.push(key);
    }

    const suffix =
      differingKeys.length > 0 ? ` Differing overlapping keys: ${differingKeys.sort().join(", ")}.` : "";
    issues.push(
      `${relative(appEnvPath)} is a separate file. Replace it with a symlink to ../../.env.local or remove it.${suffix}`,
    );
  }
}

if (issues.length > 0) {
  console.error("Local env check failed:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log("Local env check passed.");
