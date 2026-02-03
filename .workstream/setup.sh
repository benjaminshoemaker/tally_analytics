#!/usr/bin/env bash
# .workstream/setup.sh — Initialize a worktree directory for development
# Does NOT create the worktree — that's done by `git worktree add` or Codex App.
# This script sets up the working environment inside an existing worktree.
#
# Usage: .workstream/setup.sh [--force]
#   --force  Overwrite existing env files (default: skip if present)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

# ── Parse flags ──────────────────────────────────────────────────────────────

FORCE=false
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    --help|-h)
      echo "Usage: .workstream/setup.sh [--force]"
      echo "  --force  Overwrite existing env files"
      exit 0
      ;;
  esac
done

# ── Step 1: Resolve main worktree ────────────────────────────────────────────

MAIN_WT="$(ws_main_worktree)"
ws_log "Main worktree: $MAIN_WT"
ws_log "Current directory: $(pwd)"

if ws_is_worktree; then
  ws_log "Detected: running in a git worktree"
else
  ws_log "Detected: running in main checkout"
fi

# ── Step 2: Copy env files from main worktree ────────────────────────────────

ws_log "Copying environment files..."
env_copied=0
env_skipped=0

while IFS= read -r envfile; do
  [ -z "$envfile" ] && continue

  src="$MAIN_WT/$envfile"
  dest="$(pwd)/$envfile"

  if [ ! -f "$src" ]; then
    ws_log_warn "  $envfile — not found in main worktree, skipping"
    continue
  fi

  if [ -f "$dest" ] && [ "$FORCE" = false ]; then
    ws_log "  $envfile — already exists, skipping (use --force to overwrite)"
    env_skipped=$((env_skipped + 1))
    continue
  fi

  # Ensure target directory exists
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  ws_log "  $envfile — copied"
  env_copied=$((env_copied + 1))
done < <(ws_env_files)

ws_log "Env files: $env_copied copied, $env_skipped skipped"

# ── Step 3: Symlink .claude/settings.local.json ──────────────────────────────

SETTINGS_SRC="$MAIN_WT/.claude/settings.local.json"
SETTINGS_DEST="$(pwd)/.claude/settings.local.json"

if [ -f "$SETTINGS_SRC" ]; then
  if ws_is_worktree; then
    mkdir -p "$(pwd)/.claude"
    if [ -L "$SETTINGS_DEST" ]; then
      ws_log "settings.local.json — symlink already exists"
    elif [ -f "$SETTINGS_DEST" ]; then
      if [ "$FORCE" = true ]; then
        rm "$SETTINGS_DEST"
        ln -s "$SETTINGS_SRC" "$SETTINGS_DEST"
        ws_log "settings.local.json — replaced with symlink"
      else
        ws_log "settings.local.json — file exists, skipping (use --force to replace with symlink)"
      fi
    else
      ln -s "$SETTINGS_SRC" "$SETTINGS_DEST"
      ws_log "settings.local.json — symlinked from main worktree"
    fi
  else
    ws_log "settings.local.json — in main checkout, no symlink needed"
  fi
else
  ws_log "settings.local.json — not found in main worktree, skipping"
fi

# ── Step 4: Install dependencies ─────────────────────────────────────────────

PM="$(ws_detect_package_manager)"
ws_log "Package manager: $PM"

if [ -f "$(ws_project_root)/package.json" ]; then
  ws_log "Installing dependencies with $PM..."
  case "$PM" in
    pnpm)  pnpm install --frozen-lockfile 2>/dev/null || pnpm install ;;
    yarn)  yarn install --frozen-lockfile 2>/dev/null || yarn install ;;
    bun)   bun install --frozen-lockfile 2>/dev/null || bun install ;;
    npm|*) npm ci 2>/dev/null || npm install ;;
  esac
  ws_log "Dependencies installed"
else
  ws_log "No package.json found, skipping dependency install"
fi

# ── Step 5: Run postInstall hooks ────────────────────────────────────────────

ws_run_hooks "postInstall"

# ── Done ─────────────────────────────────────────────────────────────────────

ws_log "Setup complete"
