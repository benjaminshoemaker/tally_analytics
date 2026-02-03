#!/usr/bin/env bash
# .workstream/lib.sh — Shared utility library for workstream scripts
# Sourced by setup.sh, dev.sh, verify.sh
# Orchestrator-agnostic: works with Codex App, Claude Code, or manual usage

set -euo pipefail

# ── Logging ──────────────────────────────────────────────────────────────────

ws_log() {
  echo "[workstream] $*"
}

ws_log_error() {
  echo "[workstream] ERROR: $*" >&2
}

ws_log_warn() {
  echo "[workstream] WARN: $*" >&2
}

# ── JSON Parsing ─────────────────────────────────────────────────────────────
# Strategy: node -e (primary), python3 -c (fallback). Never grep/sed JSON.

_ws_json_parser=""

_ws_detect_json_parser() {
  if [ -n "$_ws_json_parser" ]; then
    return
  fi
  if command -v node >/dev/null 2>&1; then
    _ws_json_parser="node"
  elif command -v python3 >/dev/null 2>&1; then
    _ws_json_parser="python3"
  else
    ws_log_error "No JSON parser available (need node or python3)"
    return 1
  fi
}

# Read a value from a JSON file by dot-path (e.g., "services.dev.command")
# Usage: ws_json_get <file> <dot.path> [default_value]
# Returns empty string (or default) if path not found or file missing
ws_json_get() {
  local file="$1" path="$2" default="${3:-}"

  if [ ! -f "$file" ]; then
    echo "$default"
    return 0
  fi

  _ws_detect_json_parser || { echo "$default"; return 0; }

  local result
  if [ "$_ws_json_parser" = "node" ]; then
    result=$(node -e "
      const fs = require('fs');
      try {
        const data = JSON.parse(fs.readFileSync('$file', 'utf8'));
        const val = '$path'.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, data);
        if (val !== undefined && val !== null) {
          if (typeof val === 'object') process.stdout.write(JSON.stringify(val));
          else process.stdout.write(String(val));
        }
      } catch(e) {}
    " 2>/dev/null) || true
  else
    result=$(python3 -c "
import json, sys
try:
    with open('$file') as f:
        data = json.load(f)
    keys = '$path'.split('.')
    val = data
    for k in keys:
        if isinstance(val, dict) and k in val:
            val = val[k]
        else:
            sys.exit(0)
    if val is not None:
        if isinstance(val, (dict, list)):
            print(json.dumps(val), end='')
        else:
            print(val, end='')
except: pass
" 2>/dev/null) || true
  fi

  if [ -n "$result" ]; then
    echo "$result"
  else
    echo "$default"
  fi
}

# Read a JSON array as newline-separated values
# Usage: ws_json_array <file> <dot.path>
ws_json_array() {
  local file="$1" path="$2"

  if [ ! -f "$file" ]; then
    return 0
  fi

  _ws_detect_json_parser || return 0

  if [ "$_ws_json_parser" = "node" ]; then
    node -e "
      const fs = require('fs');
      try {
        const data = JSON.parse(fs.readFileSync('$file', 'utf8'));
        const val = '$path'.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, data);
        if (Array.isArray(val)) val.forEach(v => console.log(v));
      } catch(e) {}
    " 2>/dev/null || true
  else
    python3 -c "
import json
try:
    with open('$file') as f:
        data = json.load(f)
    keys = '$path'.split('.')
    val = data
    for k in keys:
        if isinstance(val, dict) and k in val:
            val = val[k]
        else:
            val = None; break
    if isinstance(val, list):
        for item in val:
            print(item)
except: pass
" 2>/dev/null || true
  fi
}

# ── Configuration ────────────────────────────────────────────────────────────

# Resolve the project root (where .git lives)
ws_project_root() {
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

# Path to workstream.json in the project root
_ws_config_file() {
  echo "$(ws_project_root)/workstream.json"
}

# Path to .claude/verification-config.json
_ws_verification_config_file() {
  echo "$(ws_project_root)/.claude/verification-config.json"
}

# Path to package.json
_ws_package_json() {
  echo "$(ws_project_root)/package.json"
}

# Read a value from workstream.json
# Usage: ws_read_config <dot.path> [default]
ws_read_config() {
  ws_json_get "$(_ws_config_file)" "$1" "${2:-}"
}

# Read a value from verification-config.json
# Usage: ws_read_verification_config <dot.path> [default]
ws_read_verification_config() {
  ws_json_get "$(_ws_verification_config_file)" "$1" "${2:-}"
}

# ── Package Manager Detection ───────────────────────────────────────────────

# Detect package manager from lockfile
# Priority: workstream.json > lockfile detection > npm fallback
ws_detect_package_manager() {
  local root
  root="$(ws_project_root)"

  # 1. Explicit in workstream.json
  local configured
  configured=$(ws_read_config "packageManager")
  if [ -n "$configured" ]; then
    echo "$configured"
    return
  fi

  # 2. Lockfile detection
  if [ -f "$root/pnpm-lock.yaml" ]; then
    echo "pnpm"
  elif [ -f "$root/yarn.lock" ]; then
    echo "yarn"
  elif [ -f "$root/bun.lockb" ] || [ -f "$root/bun.lock" ]; then
    echo "bun"
  elif [ -f "$root/package-lock.json" ] || [ -f "$root/package.json" ]; then
    echo "npm"
  else
    echo "npm"
  fi
}

# ── Worktree Detection ──────────────────────────────────────────────────────

# Resolve the main worktree path
# Priority: $WS_MAIN_WORKTREE env var > git worktree list (first entry)
ws_main_worktree() {
  if [ -n "${WS_MAIN_WORKTREE:-}" ]; then
    echo "$WS_MAIN_WORKTREE"
    return
  fi

  # git worktree list outputs: /path/to/worktree  <hash> [branch]
  # The first entry is always the main worktree
  git worktree list --porcelain 2>/dev/null | head -1 | sed 's/^worktree //' || pwd
}

# Check if current directory is a git worktree (not the main checkout)
ws_is_worktree() {
  local main_wt
  main_wt="$(ws_main_worktree)"
  local current
  current="$(pwd -P)"
  main_wt="$(cd "$main_wt" 2>/dev/null && pwd -P)"

  if [ "$current" != "$main_wt" ] && [ -f "$(git rev-parse --git-dir)/commondir" ]; then
    return 0  # true: is a worktree
  else
    return 1  # false: is main checkout
  fi
}

# ── Env Files ────────────────────────────────────────────────────────────────

# List env files to copy from main worktree
# Priority: workstream.json setup.envFiles > defaults
ws_env_files() {
  local files
  files=$(ws_json_array "$(_ws_config_file)" "setup.envFiles")

  if [ -n "$files" ]; then
    echo "$files"
  else
    # Default env files
    echo ".env.local"
  fi
}

# ── Port Allocation ──────────────────────────────────────────────────────────

# Allocate a port for the dev server
# Priority: explicit $1 > workstream.json > hash-based + probe/walk-forward
ws_allocate_port() {
  local explicit_port="${1:-}"

  # 1. Explicit argument
  if [ -n "$explicit_port" ]; then
    _ws_probe_port "$explicit_port"
    return
  fi

  # 2. workstream.json default
  local config_port
  config_port=$(ws_read_config "services.dev.defaultPort")
  if [ -n "$config_port" ]; then
    _ws_probe_port "$config_port"
    return
  fi

  # 3. Hash-based from $PWD (deterministic per worktree)
  local hash_port
  hash_port=$(_ws_hash_port)
  _ws_probe_port "$hash_port"
}

# Generate a deterministic port from the current directory path
_ws_hash_port() {
  local hash
  if command -v md5sum >/dev/null 2>&1; then
    hash=$(echo -n "$PWD" | md5sum | cut -c1-8)
  elif command -v md5 >/dev/null 2>&1; then
    hash=$(echo -n "$PWD" | md5 | cut -c1-8)
  else
    # Fallback: use a simple checksum
    hash=$(echo -n "$PWD" | cksum | cut -d' ' -f1)
  fi
  # Map to range 10000–14999
  echo $(( (0x${hash:-0} % 5000) + 10000 ))
}

# Probe a port and walk forward until finding a free one
# Range: starting port to starting port + 99 (max 100 attempts)
_ws_probe_port() {
  local port="$1"
  local max_attempts=100
  local attempt=0

  while [ $attempt -lt $max_attempts ]; do
    if ! lsof -i :"$port" >/dev/null 2>&1; then
      echo "$port"
      return
    fi
    ws_log_warn "Port $port in use, trying next..."
    port=$((port + 1))
    attempt=$((attempt + 1))
  done

  ws_log_error "Could not find free port after $max_attempts attempts starting from $1"
  return 1
}

# ── Dev Command Resolution ───────────────────────────────────────────────────

# Resolve the dev server command
# Priority: workstream.json > verification-config.json > $PM run dev
ws_dev_command() {
  # 1. workstream.json
  local ws_cmd
  ws_cmd=$(ws_read_config "services.dev.command")
  if [ -n "$ws_cmd" ]; then
    echo "$ws_cmd"
    return
  fi

  # 2. verification-config.json
  local vc_cmd
  vc_cmd=$(ws_read_verification_config "devServer.command")
  if [ -n "$vc_cmd" ]; then
    echo "$vc_cmd"
    return
  fi

  # 3. Default: package manager run dev
  local pm
  pm=$(ws_detect_package_manager)
  echo "$pm run dev"
}

# ── Verify Command Resolution ───────────────────────────────────────────────

# Get the list of verification steps
# Priority: workstream.json > defaults
ws_verify_steps() {
  local steps
  steps=$(ws_json_array "$(_ws_config_file)" "verify.steps")

  if [ -n "$steps" ]; then
    echo "$steps"
  else
    # Default steps in fail-fast order
    echo "typecheck"
    echo "lint"
    echo "test"
    echo "build"
  fi
}

# Resolve the command for a single verification step
# Priority: workstream.json > verification-config.json > package.json scripts > fallback
ws_verify_command() {
  local step="$1"
  local pm
  pm=$(ws_detect_package_manager)

  # 1. workstream.json verify.commands.<step>
  local ws_cmd
  ws_cmd=$(ws_read_config "verify.commands.$step")
  if [ -n "$ws_cmd" ]; then
    echo "$ws_cmd"
    return
  fi

  # 2. verification-config.json commands.<step>
  local vc_cmd
  vc_cmd=$(ws_read_verification_config "commands.$step")
  if [ -n "$vc_cmd" ]; then
    echo "$vc_cmd"
    return
  fi

  # 3. package.json scripts (check if script exists)
  local pkg_json
  pkg_json="$(_ws_package_json)"
  if [ -f "$pkg_json" ]; then
    local script_name=""
    case "$step" in
      typecheck) script_name=$(ws_json_get "$pkg_json" "scripts.typecheck") ;;
      lint)      script_name=$(ws_json_get "$pkg_json" "scripts.lint") ;;
      test)      script_name=$(ws_json_get "$pkg_json" "scripts.test") ;;
      build)     script_name=$(ws_json_get "$pkg_json" "scripts.build") ;;
    esac
    if [ -n "$script_name" ]; then
      echo "$pm run $step"
      return
    fi
  fi

  # 4. No command found — return empty (step will be skipped)
  echo ""
}

# ── Hooks ────────────────────────────────────────────────────────────────────

# Run hooks from workstream.json for a given phase
# Usage: ws_run_hooks <phase>  (e.g., "postInstall")
ws_run_hooks() {
  local phase="$1"
  local hooks
  hooks=$(ws_json_array "$(_ws_config_file)" "setup.$phase")

  if [ -z "$hooks" ]; then
    return 0
  fi

  ws_log "Running $phase hooks..."
  while IFS= read -r hook; do
    if [ -n "$hook" ]; then
      ws_log "  → $hook"
      eval "$hook"
    fi
  done <<< "$hooks"
}
