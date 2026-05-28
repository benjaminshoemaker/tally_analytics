import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');

const matrix = [
  {
    id: 'codex',
    label: 'Codex CLI',
    support: 'automated',
    docsPatterns: ['codex mcp add tally --url https://usetally.xyz/api/mcp'],
    command: ['pnpm', ['--filter', 'web', 'e2e:mcp-self-test']],
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    support: 'documented',
    docsPatterns: ['claude mcp add --transport http tally https://usetally.xyz/api/mcp'],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    support: 'documented',
    docsPatterns: ['"mcpServers"', '"url": "https://usetally.xyz/api/mcp"'],
  },
  {
    id: 'generic-http',
    label: 'Generic HTTP MCP client',
    support: 'documented',
    docsPatterns: ['https://usetally.xyz/api/mcp'],
  },
];

function parseArgs(argv) {
  const args = { runAutomated: false, help: false };
  for (const arg of argv) {
    if (arg === '--') continue;
    else if (arg === '--run-automated') args.runAutomated = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log('Usage: pnpm --filter web e2e:mcp-client-matrix [--run-automated]');
  console.log('');
  console.log('Verifies the claimed MCP client support matrix.');
  console.log('By default, documented clients are checked against install copy.');
  console.log('--run-automated also runs automated client harnesses, currently Codex.');
}

function readMarketingInstallCopy() {
  const files = [
    path.join(appDir, 'components', 'marketing', 'agent-install-tabs.tsx'),
    path.join(appDir, 'app', '(marketing)', 'docs', 'setup', 'page.tsx'),
  ];
  return files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: process.env,
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

  const installCopy = readMarketingInstallCopy();
  const results = [];

  for (const client of matrix) {
    const missingPatterns = client.docsPatterns.filter((pattern) => !installCopy.includes(pattern));
    if (missingPatterns.length > 0) {
      throw new Error(`${client.label} is missing install copy: ${missingPatterns.join(', ')}`);
    }

    if (client.support === 'automated' && args.runAutomated) {
      const [command, commandArgs] = client.command;
      run(command, commandArgs);
      results.push({ id: client.id, label: client.label, status: 'automated_passed' });
    } else {
      results.push({
        id: client.id,
        label: client.label,
        status: client.support === 'automated' ? 'automated_available' : 'documented_only',
      });
    }
  }

  console.log(JSON.stringify({ ok: true, clients: results }, null, 2));
}

main();
