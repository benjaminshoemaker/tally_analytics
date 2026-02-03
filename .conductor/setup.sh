#!/usr/bin/env zsh
# Conductor workspace setup script
# Runs inside each newly-created workspace directory.
# $CONDUCTOR_ROOT_PATH = the main repo root.

# 1. Symlink settings.local.json (gitignored, so never in worktrees)
if [ -d ".claude" ] && [ -f "$CONDUCTOR_ROOT_PATH/.claude/settings.local.json" ]; then
  [ -f ".claude/settings.local.json" ] || \
    ln -s "$CONDUCTOR_ROOT_PATH/.claude/settings.local.json" ".claude/settings.local.json"
  echo "✓ Linked settings.local.json"
fi

# 2. Create command aliases for skills (fixes Conductor autocomplete)
#    Conductor scans .claude/commands/ but not .claude/skills/ for autocomplete.
#    Symlink each skill's SKILL.md into commands/ so "/" shows them.
if [ -d ".claude/skills" ]; then
  mkdir -p .claude/commands
  for skill_dir in .claude/skills/*/; do
    skill_name=$(basename "$skill_dir")
    [ -f "$skill_dir/SKILL.md" ] || continue
    # Skip if a real command file already exists (don't overwrite)
    [ -e ".claude/commands/$skill_name.md" ] && continue
    ln -s "../skills/$skill_name/SKILL.md" ".claude/commands/$skill_name.md"
  done
  echo "✓ Linked skills into commands/ for autocomplete"
fi

# 3. Install dependencies if a lockfile exists
if [ -f "pnpm-lock.yaml" ]; then
  pnpm install
elif [ -f "package-lock.json" ]; then
  npm install
elif [ -f "yarn.lock" ]; then
  yarn install
fi
