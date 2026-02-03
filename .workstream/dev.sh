#!/usr/bin/env bash
# .workstream/dev.sh — Start the dev server on a specified or auto-allocated port
#
# Usage: .workstream/dev.sh [PORT]
#   PORT  Optional explicit port number. If omitted, uses workstream.json
#         default or auto-allocates a deterministic port based on $PWD.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

# ── Parse arguments ──────────────────────────────────────────────────────────

EXPLICIT_PORT="${1:-}"

case "${EXPLICIT_PORT}" in
  --help|-h)
    echo "Usage: .workstream/dev.sh [PORT]"
    echo "  PORT  Explicit port number (default: auto-allocate)"
    exit 0
    ;;
esac

# ── Allocate port ────────────────────────────────────────────────────────────

PORT=$(ws_allocate_port "$EXPLICIT_PORT")
export WS_PORT_DEV="$PORT"
ws_log "Dev server port: $PORT"

# ── Resolve dev command ──────────────────────────────────────────────────────

DEV_CMD="$(ws_dev_command)"

if [ -z "$DEV_CMD" ]; then
  ws_log_error "No dev command found. Configure in workstream.json, verification-config.json, or add a 'dev' script to package.json."
  exit 1
fi

ws_log "Dev command (raw): $DEV_CMD"

# ── Inject port ──────────────────────────────────────────────────────────────

# If the command contains $WS_PORT_DEV, let env substitution handle it.
# Otherwise, append a framework-appropriate port flag.
if echo "$DEV_CMD" | grep -q '\$WS_PORT_DEV\|WS_PORT_DEV'; then
  # Command uses the variable — envsubst or shell expansion will handle it
  FINAL_CMD=$(echo "$DEV_CMD" | sed "s/\\\$WS_PORT_DEV/$PORT/g; s/\${WS_PORT_DEV}/$PORT/g")
else
  # Auto-detect framework port flag
  # Astro/Vite: --port, Next.js: -p, generic: --port
  if echo "$DEV_CMD" | grep -qiE 'next|next-dev'; then
    FINAL_CMD="$DEV_CMD -p $PORT"
  else
    # Astro, Vite, and most others use --port
    FINAL_CMD="$DEV_CMD -- --port $PORT"
  fi
fi

ws_log "Starting: $FINAL_CMD"

# ── Run ──────────────────────────────────────────────────────────────────────

exec bash -c "$FINAL_CMD"
