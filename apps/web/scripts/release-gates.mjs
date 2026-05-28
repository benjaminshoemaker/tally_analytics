import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/postgres';

const localCommands = [
  ['pnpm', ['--filter', 'web', 'test']],
  ['pnpm', ['--filter', 'web', 'typecheck']],
  ['pnpm', ['--filter', 'web', 'lint']],
  ['pnpm', ['--filter', 'web', 'build']],
  ['pnpm', ['--filter', 'web', 'e2e:mcp-install-compatibility']],
  ['pnpm', ['--filter', 'web', 'e2e:mcp-client-matrix']],
  ['pnpm', ['--filter', 'web', 'e2e:scenarios']],
  ['pnpm', ['--filter', 'web', 'e2e:seed', 'mcp-active-with-events']],
  ['pnpm', ['--filter', 'web', 'e2e:replay-events', 'mcp-active-with-events']],
  ['pnpm', ['--filter', 'web', 'e2e', '--grep', '@scenario']],
  ['pnpm', ['--filter', 'web', 'e2e:mcp-self-test']],
  ['pnpm', ['--filter', 'web', 'e2e:mcp-analytics-querying']],
  ['pnpm', ['--filter', 'web', 'e2e:mcp-pending-tasks']],
  ['pnpm', ['--filter', 'web', 'e2e:stripe-billing']],
];

const externalCommands = [
  ['pnpm', ['--filter', 'web', 'e2e:hosted-smoke']],
  ['pnpm', ['--filter', 'web', 'e2e:stripe-billing:real']],
  ['pnpm', ['--filter', 'web', 'github:sandbox:sync', '--', '--org', process.env.GITHUB_SANDBOX_ORG ?? 'fast-pr-analytics-sandbox', '--dry-run']],
];

function parseArgs(argv) {
  const args = { external: false, help: false };
  for (const arg of argv) {
    if (arg === '--') continue;
    else if (arg === '--external') args.external = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log('Usage: pnpm --filter web e2e:release-local');
  console.log('Usage: pnpm --filter web e2e:release-external');
  console.log('');
  console.log('Local gates are account-free and deterministic.');
  console.log('External gates require hosted Tally, Stripe test-mode credentials, and GitHub sandbox access.');
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const commands = args.external ? externalCommands : localCommands;
  for (const [command, commandArgs] of commands) {
    run(command, commandArgs);
  }
  console.log(JSON.stringify({ ok: true, gate: args.external ? 'external' : 'local', commands: commands.length }, null, 2));
}

main();
