# Edge Cases

## Codex Skills Directory Doesn't Exist

If `~/.codex/skills` (or `$CODEX_HOME/skills`) doesn't exist:

```
CODEX CLI SKILL PACK
────────────────────
Location: ~/.codex/skills
Status:   DIRECTORY NOT FOUND

Codex CLI may not be installed, or uses a different skills location.

To install skills anyway:
  ./scripts/install-codex-skill-pack.sh

To specify a custom location:
  export CODEX_HOME=/path/to/codex
```

Skip Codex syncing unless user explicitly requests installation.

## No Projects Found

```
No toolkit-using projects found in ~/Projects

To set up a project with this toolkit:
1. Navigate to your project directory
2. Run /setup or /generate-plan

To search additional paths, set:
  export TOOLKIT_SEARCH_PATH="~/Projects:~/work"
```

## Project Points to Different Toolkit

Skip silently — it's using a different toolkit installation.

## Git Not Available in Project

```
Warning: ~/Projects/legacy-app is not a git repository
  Cannot detect activity status - treating as DORMANT
```

## Sync Conflicts

If a project has local modifications to skills that differ from both the last-synced version AND the toolkit version:

1. Show the conflict with diff
2. Ask user:
   - Backup local and overwrite
   - Keep local version
   - Show full diff
3. Follow standard `/sync` conflict resolution flow
