# Workstream Contract

Orchestrator-agnostic scripts for initializing, running, and verifying git worktrees.
Works with Codex App, Claude Code, Conductor, or manual `git worktree` usage.

## Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup.sh` | Initialize a worktree for development | `bash .workstream/setup.sh [--force]` |
| `dev.sh` | Start dev server on allocated port | `bash .workstream/dev.sh [PORT]` |
| `verify.sh` | Run full quality gate (fail-fast) | `bash .workstream/verify.sh [STEP...]` |
| `lib.sh` | Shared utility library (sourced, not run directly) | `source .workstream/lib.sh` |

## Quick Start

### In a git worktree

```bash
# Create a worktree (Codex App does this automatically)
git worktree add ../my-feature -b feature/my-feature

# Set it up
cd ../my-feature
bash .workstream/setup.sh

# Start dev server (auto-allocates port)
bash .workstream/dev.sh

# Or specify a port
bash .workstream/dev.sh 5000

# Run verification before PR
bash .workstream/verify.sh
```

### In the main checkout

All scripts work in the main checkout too — `setup.sh` skips env-copy and symlink
steps when it detects it's not in a worktree.

## Configuration

### workstream.json (project-owned)

Each project creates its own `workstream.json` at the repo root. This file is
**not synced** from the toolkit — it's project-specific.

See `workstream.json.example` for the full schema.

#### Schema Reference

| Field | Type | Description |
|-------|------|-------------|
| `project` | string | Project identifier |
| `packageManager` | string | Force package manager (`npm`, `pnpm`, `yarn`, `bun`). Auto-detected from lockfile if omitted. |
| `services.dev.command` | string | Dev server command. Use `$WS_PORT_DEV` for port substitution. |
| `services.dev.defaultPort` | number | Default port for dev server |
| `services.dev.healthCheck` | string | Health check URL (for future use) |
| `setup.envFiles` | string[] | Env files to copy from main worktree. Default: `[".env.local"]` |
| `setup.postInstall` | string[] | Shell commands to run after `npm install` |
| `verify.steps` | string[] | Verification steps in execution order. Default: `["typecheck", "lint", "test", "build"]` |
| `verify.commands` | object | Override commands per step (e.g., `{"lint": "npm run lint:fix"}`) |

### Config Priority Chain

Scripts resolve commands from multiple sources in priority order:

1. **workstream.json** — Project-level explicit config
2. **verification-config.json** — Existing Claude Code verification config (`.claude/verification-config.json`)
3. **package.json scripts** — Auto-detected from npm scripts
4. **Fallbacks** — Sensible defaults based on detected package manager

## Port Allocation

Ports are allocated using a three-tier strategy:

1. **Explicit:** Pass a port as argument (`bash .workstream/dev.sh 5000`)
2. **Configured:** `services.dev.defaultPort` in `workstream.json`
3. **Hash-based:** Deterministic port derived from `$PWD`, mapped to range 10000–14999

After selecting a candidate port, a **probe + walk-forward** mechanism checks
availability via `lsof`. If the port is in use, it increments until finding a
free one (max 100 attempts).

This means each worktree directory gets a stable, deterministic port that
avoids collisions with other worktrees.

## Using with Codex App

Codex App's worktree mode creates isolated git worktrees per thread. To
integrate:

1. In Codex App → Project Settings → Local Environment → Setup script:
   ```
   bash .workstream/setup.sh
   ```
   (Or: `bash .codex/setup.sh` which delegates to the same script)

2. Codex threads will automatically get dependencies installed and env files
   copied when created.

3. The `.codex/AGENTS.md` file provides Codex-specific agent instructions.

## Using with Claude Code

Claude Code works in the current directory. For worktree workflows:

```bash
# Create worktree
git worktree add ../my-feature -b feature/my-feature

# Start Claude Code in the worktree
cd ../my-feature
bash .workstream/setup.sh
claude  # or open in IDE with Claude Code extension
```

The `verify.sh` script serves as the quality gate before creating PRs.

## Extending

### Custom verification steps

Add custom steps to `workstream.json`:

```json
{
  "verify": {
    "steps": ["typecheck", "lint", "test", "e2e", "build"],
    "commands": {
      "e2e": "npx playwright test"
    }
  }
}
```

### Post-install hooks

Run project-specific setup after dependency install:

```json
{
  "setup": {
    "postInstall": [
      "npx prisma generate",
      "bash scripts/seed-dev-db.sh"
    ]
  }
}
```

### Multiple env files

```json
{
  "setup": {
    "envFiles": [".env.local", ".env.development", ".dev.vars"]
  }
}
```
