import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');

function parseArgs(argv) {
  const args = { sandbox: false, help: false };
  for (const arg of argv) {
    if (arg === '--') continue;
    else if (arg === '--sandbox') args.sandbox = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log('Usage: pnpm --filter web e2e:mcp-install-compatibility [--sandbox]');
  console.log('');
  console.log('Runs the MCP Next.js install compatibility gate.');
  console.log('--sandbox also runs the full MCP self-test against the GitHub sandbox App Router fixture.');
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

  run('pnpm', [
    '--filter',
    'web',
    'test',
    '--',
    'mcp-next-install',
    'mcp-repo-context',
    'detect-framework',
    'github-generate-events-url',
  ]);

  if (args.sandbox) {
    run('pnpm', ['--filter', 'web', 'e2e:mcp-self-test', '--', '--from-sandbox']);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        coverage: [
          'Next.js App Router root/src/JSX/TSX install patch generation',
          'Next.js Pages Router root/src/JSX/TSX install patch generation',
          'monorepo appRoot/package target resolution',
          'already-installed and conflicting integration boundaries',
          'unsupported and malformed app rejection',
          ...(args.sandbox ? ['sandbox App Router MCP self-test'] : []),
        ],
      },
      null,
      2
    )
  );
}

main();
