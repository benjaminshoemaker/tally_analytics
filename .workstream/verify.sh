#!/usr/bin/env bash
# .workstream/verify.sh — Run full quality gate (fail-fast)
# Steps are executed in order: typecheck → lint → test → build
# Stops on the first failure. Exit 0 = all passed, exit 1 = failure.
#
# Usage: .workstream/verify.sh [STEP...]
#   No arguments: runs all configured steps
#   With arguments: runs only the specified steps (e.g., "lint test")

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

# ── Parse arguments ──────────────────────────────────────────────────────────

case "${1:-}" in
  --help|-h)
    echo "Usage: .workstream/verify.sh [STEP...]"
    echo "  No arguments: runs all configured steps"
    echo "  With arguments: runs only specified steps"
    echo "  Steps: typecheck, lint, test, build"
    exit 0
    ;;
esac

# ── Collect steps ────────────────────────────────────────────────────────────

if [ $# -gt 0 ]; then
  # Explicit steps from arguments
  STEPS=("$@")
else
  # Read configured steps
  mapfile -t STEPS < <(ws_verify_steps)
fi

if [ ${#STEPS[@]} -eq 0 ]; then
  ws_log "No verification steps configured"
  exit 0
fi

ws_log "Verification steps: ${STEPS[*]}"
echo ""

# ── Run steps ────────────────────────────────────────────────────────────────

passed=0
failed=0
skipped=0
failed_step=""

for step in "${STEPS[@]}"; do
  [ -z "$step" ] && continue

  cmd=$(ws_verify_command "$step")

  if [ -z "$cmd" ]; then
    ws_log "[$step] — no command configured, skipping"
    skipped=$((skipped + 1))
    continue
  fi

  ws_log "[$step] → $cmd"

  if bash -c "$cmd"; then
    ws_log "[$step] ✓ passed"
    passed=$((passed + 1))
  else
    ws_log_error "[$step] ✗ failed"
    failed=$((failed + 1))
    failed_step="$step"
    break  # fail-fast
  fi

  echo ""
done

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "────────────────────────────────────────"

total=$((passed + failed + skipped))
ws_log "Verify complete: $passed passed, $failed failed, $skipped skipped (of $total)"

if [ $failed -gt 0 ]; then
  ws_log_error "Failed at: $failed_step"
  exit 1
fi

ws_log "All checks passed"
exit 0
