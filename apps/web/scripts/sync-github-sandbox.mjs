import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const fixtures = [
  {
    name: 'fpa-fixture-next-app-router',
    description: 'Fast PR Analytics sandbox fixture: Next.js App Router',
    files: {
      'README.md':
        '# Next App Router Fixture\n\nSupported Next.js App Router fixture for Fast PR Analytics sandbox tests.\n',
      'package.json': JSON.stringify(
        {
          scripts: { dev: 'next dev', build: 'next build' },
          dependencies: { next: '14.2.20', react: '18.3.1', 'react-dom': '18.3.1' },
          devDependencies: {
            typescript: '^5.7.2',
            '@types/react': '^18.3.12',
            '@types/node': '^20.17.6',
          },
        },
        null,
        2
      ),
      'app/layout.tsx': [
        'export default function RootLayout({ children }: { children: React.ReactNode }) {',
        '  return <html lang="en"><body>{children}</body></html>;',
        '}',
        '',
      ].join('\n'),
      'app/page.tsx':
        'export default function Page() {\n  return <main>App Router fixture</main>;\n}\n',
      'tsconfig.json': JSON.stringify(
        { compilerOptions: { jsx: 'preserve', strict: true } },
        null,
        2
      ),
    },
  },
  {
    name: 'fpa-fixture-next-pages-router',
    description: 'Fast PR Analytics sandbox fixture: Next.js Pages Router',
    files: {
      'README.md':
        '# Next Pages Router Fixture\n\nSupported Next.js Pages Router fixture for Fast PR Analytics sandbox tests.\n',
      'package.json': JSON.stringify(
        {
          scripts: { dev: 'next dev', build: 'next build' },
          dependencies: { next: '14.2.20', react: '18.3.1', 'react-dom': '18.3.1' },
          devDependencies: {
            typescript: '^5.7.2',
            '@types/react': '^18.3.12',
            '@types/node': '^20.17.6',
          },
        },
        null,
        2
      ),
      'pages/_app.tsx': [
        "import type { AppProps } from 'next/app';",
        '',
        'export default function App({ Component, pageProps }: AppProps) {',
        '  return <Component {...pageProps} />;',
        '}',
        '',
      ].join('\n'),
      'pages/index.tsx':
        'export default function Home() {\n  return <main>Pages Router fixture</main>;\n}\n',
      'tsconfig.json': JSON.stringify(
        { compilerOptions: { jsx: 'preserve', strict: true } },
        null,
        2
      ),
    },
  },
  {
    name: 'fpa-fixture-existing-analytics',
    description: 'Fast PR Analytics sandbox fixture: existing analytics detection',
    files: {
      'README.md':
        '# Existing Analytics Fixture\n\nSupported Next.js repo that already contains Vercel Analytics.\n',
      'package.json': JSON.stringify(
        {
          scripts: { dev: 'next dev', build: 'next build' },
          dependencies: {
            next: '14.2.20',
            react: '18.3.1',
            'react-dom': '18.3.1',
            '@vercel/analytics': '^1.6.1',
          },
          devDependencies: {
            typescript: '^5.7.2',
            '@types/react': '^18.3.12',
            '@types/node': '^20.17.6',
          },
        },
        null,
        2
      ),
      'app/layout.tsx': [
        "import { Analytics } from '@vercel/analytics/react';",
        '',
        'export default function RootLayout({ children }: { children: React.ReactNode }) {',
        '  return <html lang="en"><body>{children}<Analytics /></body></html>;',
        '}',
        '',
      ].join('\n'),
      'app/page.tsx':
        'export default function Page() {\n  return <main>Existing analytics fixture</main>;\n}\n',
      'tsconfig.json': JSON.stringify(
        { compilerOptions: { jsx: 'preserve', strict: true } },
        null,
        2
      ),
    },
  },
  {
    name: 'fpa-fixture-unsupported-remix',
    description: 'Fast PR Analytics sandbox fixture: unsupported Remix app',
    files: {
      'README.md':
        '# Unsupported Remix Fixture\n\nUnsupported framework fixture for Fast PR Analytics sandbox tests.\n',
      'package.json': JSON.stringify(
        {
          scripts: { dev: 'remix dev', build: 'remix build' },
          dependencies: {
            '@remix-run/react': '^2.16.0',
            '@remix-run/node': '^2.16.0',
            react: '18.3.1',
            'react-dom': '18.3.1',
          },
          devDependencies: { typescript: '^5.7.2' },
        },
        null,
        2
      ),
      'app/root.tsx':
        'export default function Root() {\n  return <html><body>Unsupported Remix fixture</body></html>;\n}\n',
    },
  },
  {
    name: 'fpa-fixture-malformed-next',
    description: 'Fast PR Analytics sandbox fixture: Next.js without supported entrypoint',
    files: {
      'README.md':
        '# Malformed Next Fixture\n\nNext.js fixture missing app/layout.tsx and pages/_app.tsx.\n',
      'package.json': JSON.stringify(
        {
          scripts: { dev: 'next dev', build: 'next build' },
          dependencies: { next: '14.2.20', react: '18.3.1', 'react-dom': '18.3.1' },
          devDependencies: { typescript: '^5.7.2' },
        },
        null,
        2
      ),
      'app/page.tsx':
        'export default function Page() {\n  return <main>Malformed Next fixture</main>;\n}\n',
    },
  },
  {
    name: 'fpa-fixture-monorepo-next',
    description: 'Fast PR Analytics sandbox fixture: monorepo with nested Next.js app',
    files: {
      'README.md':
        '# Monorepo Next Fixture\n\nMonorepo fixture with a nested Next.js App Router app.\n',
      'package.json': JSON.stringify({ private: true, workspaces: ['apps/*'] }, null, 2),
      'apps/site/package.json': JSON.stringify(
        {
          scripts: { dev: 'next dev', build: 'next build' },
          dependencies: { next: '14.2.20', react: '18.3.1', 'react-dom': '18.3.1' },
          devDependencies: {
            typescript: '^5.7.2',
            '@types/react': '^18.3.12',
            '@types/node': '^20.17.6',
          },
        },
        null,
        2
      ),
      'apps/site/app/layout.tsx': [
        'export default function RootLayout({ children }: { children: React.ReactNode }) {',
        '  return <html lang="en"><body>{children}</body></html>;',
        '}',
        '',
      ].join('\n'),
      'apps/site/app/page.tsx':
        'export default function Page() {\n  return <main>Monorepo fixture</main>;\n}\n',
    },
  },
];

function parseArgs(argv) {
  const args = { dryRun: false, org: process.env.GITHUB_SANDBOX_ORG ?? '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') continue;
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--org') {
      args.org = argv[i + 1] ?? '';
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function assertSandboxOrg(org) {
  if (!org) throw new Error('Missing sandbox org. Pass --org <org> or set GITHUB_SANDBOX_ORG.');
  if (org.toLowerCase().includes('sandbox')) return;
  if (process.env.GITHUB_SANDBOX_FORCE === '1') return;
  throw new Error(
    `Refusing non-sandbox org: ${org}. Set GITHUB_SANDBOX_FORCE=1 only if this is intentional.`
  );
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: process.env,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  if ((result.status ?? 1) !== 0) {
    const stderr = result.stderr ? `\nstderr:\n${result.stderr}` : '';
    const stdout = result.stdout ? `\nstdout:\n${result.stdout}` : '';
    throw new Error(`Command failed: ${command} ${args.join(' ')}${stdout}${stderr}`);
  }

  return result.stdout ?? '';
}

function repoExists(owner, repo) {
  const result = spawnSync('gh', ['repo', 'view', `${owner}/${repo}`, '--json', 'name'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return result.status === 0;
}

function ensureRepo(owner, fixture, dryRun) {
  const fullName = `${owner}/${fixture.name}`;
  if (repoExists(owner, fixture.name)) {
    console.log(`Found ${fullName}`);
    return;
  }

  console.log(`Create ${fullName}`);
  if (dryRun) return;
  run('gh', ['repo', 'create', fullName, '--private', '--description', fixture.description]);
}

function emptyWorkingTree(repoDir) {
  for (const entry of fs.readdirSync(repoDir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    fs.rmSync(path.join(repoDir, entry.name), { recursive: true, force: true });
  }
}

function writeFixtureFiles(repoDir, files) {
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(repoDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content.endsWith('\n') ? content : `${content}\n`);
  }
}

function syncRepo(owner, fixture, dryRun) {
  const fullName = `${owner}/${fixture.name}`;
  ensureRepo(owner, fixture, dryRun);
  if (dryRun) {
    console.log(`Would sync ${fullName}`);
    return;
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fpa-sandbox-'));
  const repoDir = path.join(tempRoot, fixture.name);

  try {
    run('gh', ['repo', 'clone', fullName, repoDir]);
    run('git', ['checkout', '-B', 'main'], { cwd: repoDir });
    emptyWorkingTree(repoDir);
    writeFixtureFiles(repoDir, fixture.files);
    run('git', ['add', '.'], { cwd: repoDir });

    const status = run('git', ['status', '--porcelain'], { cwd: repoDir, capture: true });
    if (!status.trim()) {
      console.log(`No changes ${fullName}`);
      return;
    }

    run('git', ['config', 'user.name', 'Fast PR Analytics Sandbox'], { cwd: repoDir });
    run('git', ['config', 'user.email', 'sandbox@users.noreply.github.com'], { cwd: repoDir });
    run('git', ['commit', '-m', 'chore: sync sandbox fixture'], { cwd: repoDir });
    run('git', ['push', 'origin', 'HEAD:main'], { cwd: repoDir });
    console.log(`Synced ${fullName}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  assertSandboxOrg(args.org);

  run('gh', ['auth', 'status']);
  console.log(
    `${args.dryRun ? 'Planning' : 'Syncing'} ${fixtures.length} sandbox fixtures in ${args.org}`
  );
  for (const fixture of fixtures) {
    syncRepo(args.org, fixture, args.dryRun);
  }
}

main();
