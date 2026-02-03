#!/usr/bin/env bash
# .codex/setup.sh — Codex App setup script (thin wrapper)
# Delegates to the workstream contract for actual setup logic.
#
# Codex App wiring:
#   Settings (Cmd+,) → Local Environments → Setup script: bash .codex/setup.sh
#
# This runs when a new Codex Worktree thread is created.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -f "$SCRIPT_DIR/.workstream/setup.sh" ]; then
  exec bash "$SCRIPT_DIR/.workstream/setup.sh" "$@"
else
  # Fallback: basic dependency install when workstream scripts aren't present
  echo "[codex-setup] .workstream/setup.sh not found, running basic setup..."

  if [ -f "pnpm-lock.yaml" ]; then
    pnpm install
  elif [ -f "yarn.lock" ]; then
    yarn install
  elif [ -f "package-lock.json" ] || [ -f "package.json" ]; then
    npm ci 2>/dev/null || npm install
  fi

  echo "[codex-setup] Basic setup complete"
fi
