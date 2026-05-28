import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');
const releaseTmpRoot = path.join(repoRoot, 'tmp', 'release-external');
const stripeTmpRoot = path.join(repoRoot, 'tmp', 'stripe-billing-verification');

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/postgres';

function releaseRunId() {
  return `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(3).toString('hex')}`;
}

function externalCommands(context) {
  return [
    {
      id: 'provision-external',
      label: 'External Gate Provisioning',
      command: 'pnpm',
      args: ['--filter', 'web', 'e2e:provision-external'],
      summaryPath: path.join(repoRoot, 'tmp', 'external-gate-provision', 'summary.json'),
    },
    {
      id: 'hosted-smoke',
      label: 'Hosted Production Smoke',
      command: 'pnpm',
      args: [
        '--filter',
        'web',
        'e2e:hosted-smoke',
        '--',
        '--screenshots',
        '--artifact-dir',
        path.join(context.artifactDir, 'hosted-smoke'),
      ],
      summaryPath: path.join(context.artifactDir, 'hosted-smoke', 'summary.json'),
    },
    {
      id: 'stripe-real',
      label: 'Stripe Real Provider Billing',
      command: 'pnpm',
      args: ['--filter', 'web', 'e2e:stripe-billing:real', '--', '--keep', '--screenshots'],
      summaryPath: path.join(stripeTmpRoot, 'last-summary.json'),
    },
    {
      id: 'github-sandbox',
      label: 'GitHub Sandbox Dry Run',
      command: 'pnpm',
      args: [
        '--filter',
        'web',
        'github:sandbox:sync',
        '--',
        '--org',
        process.env.GITHUB_SANDBOX_ORG ?? 'fast-pr-analytics-sandbox',
        '--dry-run',
      ],
      summaryPath: null,
    },
  ];
}

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
  console.log('External runs write report.md, summary.json, command logs, hosted screenshots, and retained Stripe artifacts.');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function redact(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/[^\s'"`]+/gi, 'postgres://[redacted]')
    .replace(/\b(?:sk|pk|rk|whsec|cs|cus|sub|evt|in|pi|seti|pm|price|prod|bps|bpc)_[A-Za-z0-9_]+/g, (match) => {
      const prefix = match.slice(0, match.indexOf('_') + 1);
      return `${prefix}redacted_${match.slice(-4)}`;
    })
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/TALLY_HOSTED_MCP_ACCESS_TOKEN=[^\s]+/g, 'TALLY_HOSTED_MCP_ACCESS_TOKEN=[redacted]')
    .replace(/e2e\+stripe-[A-Za-z0-9._-]+@example\.com/g, 'e2e+stripe-redacted@example.com');
}

function runLocal(command, args) {
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

function runExternalCommand(context, commandConfig) {
  const startedAt = Date.now();
  const logPath = path.join(context.logsDir, `${commandConfig.id}.log`);
  const result = spawnSync(commandConfig.command, commandConfig.args, {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
    stdio: 'pipe',
  });
  const output = redact(`${result.stdout ?? ''}${result.stderr ?? ''}`);
  fs.writeFileSync(logPath, output);
  process.stderr.write(output);

  const summary = readJsonIfExists(commandConfig.summaryPath);
  const status = (result.status ?? 1) === 0 ? 'passed' : 'failed';
  const record = {
    id: commandConfig.id,
    label: commandConfig.label,
    command: `${commandConfig.command} ${commandConfig.args.join(' ')}`,
    status,
    exitCode: result.status ?? 1,
    durationMs: Date.now() - startedAt,
    logPath,
    summaryPath: commandConfig.summaryPath,
    summary,
  };

  context.summary.commands.push(record);
  writeJson(path.join(context.artifactDir, 'summary.json'), context.summary);
  writeExternalReport(context);

  if (status !== 'passed') {
    throw new Error(`${commandConfig.label} failed. See ${logPath}`);
  }
}

function screenshotLinksForHosted(summary) {
  if (!summary?.artifactDir) return [];
  const screenshotsDir = path.join(summary.artifactDir, 'screenshots');
  return ['home.png', 'privacy.png']
    .map((file) => path.join(screenshotsDir, file))
    .filter((filePath) => fs.existsSync(filePath));
}

function screenshotLinksForStripe(summary) {
  if (!summary?.artifactDir) return [];
  const screenshotsDir = path.join(summary.artifactDir, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) return [];
  return fs
    .readdirSync(screenshotsDir)
    .filter((file) => file.endsWith('.png'))
    .sort()
    .map((file) => path.join(screenshotsDir, file));
}

function formatCommandNotes(command) {
  if (command.id === 'hosted-smoke') {
    const stages = command.summary?.stages ?? [];
    const emitted = stages.find((stage) => stage.name === 'emit-production-event')?.details;
    const verified = stages.find((stage) => stage.name === 'verify-mcp-live-event')?.details;
    return [
      `- Hosted app: \`${command.summary?.appUrl ?? 'unknown'}\``,
      `- Events endpoint: \`${command.summary?.eventsUrl ?? 'unknown'}\``,
      emitted?.eventName ? `- Emitted event: \`${emitted.eventName}\`` : null,
      verified?.eventCount !== undefined ? `- MCP live events returned: \`${verified.eventCount}\`` : null,
    ].filter(Boolean);
  }

  if (command.id === 'stripe-real') {
    const real = command.summary?.real;
    const cleanup = command.summary?.cleanup;
    return [
      real?.projectId ? `- Billing project: \`${real.projectId}\`` : null,
      Array.isArray(real?.webhookEvents) ? `- Stripe listener events observed: \`${real.webhookEvents.length}\`` : null,
      cleanup?.subscriptionCancelStatuses
        ? `- Subscription cleanup statuses: \`${cleanup.subscriptionCancelStatuses.join(', ')}\``
        : null,
      cleanup?.customerDeleteStatuses ? `- Customer cleanup statuses: \`${cleanup.customerDeleteStatuses.join(', ')}\`` : null,
      command.summary?.artifactDir ? `- Stripe artifact directory: \`${command.summary.artifactDir}\`` : null,
    ].filter(Boolean);
  }

  if (command.id === 'provision-external') {
    return [
      command.summary?.hosted?.projectId ? `- Hosted smoke project: \`${command.summary.hosted.projectId}\`` : null,
      command.summary?.hosted?.accessTokenExpiresAt
        ? `- MCP token expires: \`${command.summary.hosted.accessTokenExpiresAt}\``
        : null,
      command.summary?.stripe?.proPriceId ? `- Stripe Pro price: \`${command.summary.stripe.proPriceId}\`` : null,
      command.summary?.stripe?.teamPriceId ? `- Stripe Team price: \`${command.summary.stripe.teamPriceId}\`` : null,
      command.summary?.stripe?.billingPortalConfigId
        ? `- Stripe portal config: \`${command.summary.stripe.billingPortalConfigId}\``
        : null,
    ].filter(Boolean);
  }

  if (command.id === 'github-sandbox') {
    return ['- Dry run only; no fixture repositories were mutated.'];
  }

  return [];
}

function writeExternalReport(context) {
  const lines = [
    '# External Release Gate Report',
    '',
    `- Run ID: \`${context.runId}\``,
    `- Started: \`${context.startedAt}\``,
    `- Artifact directory: \`${context.artifactDir}\``,
    `- Overall status: \`${context.summary.ok ? 'passed' : context.summary.error ? 'failed' : 'in_progress'}\``,
    `- Database host: \`${safeDatabaseHost(databaseUrl)}\``,
    '',
    '## Commands',
    '',
  ];

  for (const command of context.summary.commands) {
    lines.push(`### ${command.label}`);
    lines.push('');
    lines.push(`- Status: \`${command.status}\``);
    lines.push(`- Exit code: \`${command.exitCode}\``);
    lines.push(`- Duration: \`${command.durationMs}ms\``);
    lines.push(`- Command: \`${command.command}\``);
    lines.push(`- Log: \`${command.logPath}\``);
    if (command.summaryPath) lines.push(`- Summary: \`${command.summaryPath}\``);
    lines.push(...formatCommandNotes(command));

    const screenshots =
      command.id === 'hosted-smoke'
        ? screenshotLinksForHosted(command.summary)
        : command.id === 'stripe-real'
          ? screenshotLinksForStripe(command.summary)
          : [];
    if (screenshots.length > 0) {
      lines.push('');
      lines.push('Screenshots:');
      for (const screenshot of screenshots) {
        lines.push(`- \`${screenshot}\``);
      }
    }
    lines.push('');
  }

  lines.push('## Redaction');
  lines.push('');
  lines.push('Provider IDs, Stripe secrets, webhook secrets, bearer tokens, and generated Stripe test emails are redacted in release-gate logs and summaries where the harness controls output.');
  lines.push('');

  fs.writeFileSync(path.join(context.artifactDir, 'report.md'), `${lines.join('\n')}\n`);
}

function safeDatabaseHost(value) {
  try {
    return new URL(value).host;
  } catch {
    return 'unparseable';
  }
}

function runExternal() {
  const runId = releaseRunId();
  const artifactDir = path.join(releaseTmpRoot, runId);
  const logsDir = path.join(artifactDir, 'logs');
  ensureDir(logsDir);

  const context = {
    runId,
    artifactDir,
    logsDir,
    startedAt: new Date().toISOString(),
    summary: {
      ok: false,
      gate: 'external',
      runId,
      artifactDir,
      startedAt: new Date().toISOString(),
      commands: [],
    },
  };

  writeJson(path.join(artifactDir, 'summary.json'), context.summary);
  writeExternalReport(context);

  try {
    for (const command of externalCommands(context)) {
      runExternalCommand(context, command);
    }
    context.summary.ok = true;
  } catch (error) {
    context.summary.ok = false;
    context.summary.error = error instanceof Error ? error.message : String(error);
  } finally {
    context.summary.finishedAt = new Date().toISOString();
    writeJson(path.join(artifactDir, 'summary.json'), context.summary);
    writeExternalReport(context);
  }

  console.log(JSON.stringify(context.summary, null, 2));
  console.log(`Report: ${path.join(artifactDir, 'report.md')}`);
  if (!context.summary.ok) process.exitCode = 1;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (args.external) {
    runExternal();
    return;
  }

  for (const [command, commandArgs] of localCommands) {
    runLocal(command, commandArgs);
  }
  console.log(JSON.stringify({ ok: true, gate: 'local', commands: localCommands.length }, null, 2));
}

main();
