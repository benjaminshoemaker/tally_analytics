/** @type {import('next').NextConfig} */
const fs = require("node:fs");
const path = require("node:path");

const dotenv = require("dotenv");

const repoRootEnvLocalPath = path.join(__dirname, "..", "..", ".env.local");
if (fs.existsSync(repoRootEnvLocalPath)) {
  dotenv.config({ path: repoRootEnvLocalPath });
}

const appEnvLocalPath = path.join(__dirname, ".env.local");
try {
  if (fs.existsSync(appEnvLocalPath) && !fs.lstatSync(appEnvLocalPath).isSymbolicLink()) {
    console.warn(
      `Found apps/web/.env.local. To keep a single source of truth, consider deleting it or symlinking it to ../../.env.local.`,
    );
  }
} catch {
  // ignore
}

const nextConfig = {
  reactStrictMode: true
};

module.exports = nextConfig;
