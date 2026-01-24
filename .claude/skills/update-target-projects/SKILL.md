# Update Target Projects

Discover and sync all toolkit-using projects with the latest skills.

## Trigger

Use this skill when:
- The post-commit hook reminds you to sync after skill changes
- You want to batch-sync multiple projects at once
- You need to check which projects are out of date

## Configuration

**Search paths** (checked in order):
1. `$TOOLKIT_SEARCH_PATH` environment variable (colon-separated paths)
2. `~/Projects` (default)

**Search depth:** 3 levels (finds `~/Projects/*/` and `~/Projects/*/*/`)

## Workflow

### Phase 1: Discover Projects

Find all toolkit-using projects:

```bash
SEARCH_PATH="${TOOLKIT_SEARCH_PATH:-$HOME/Projects}"
TOOLKIT_PATH="$(pwd)"
CURRENT_COMMIT=$(git rev-parse HEAD)

# Find all projects with toolkit-version.json
find "$SEARCH_PATH" -maxdepth 4 -name "toolkit-version.json" -path "*/.claude/*" 2>/dev/null
```

For each discovered project:
1. Read `.claude/toolkit-version.json`
2. Verify `toolkit_location` matches current toolkit (skip if different toolkit)
3. Extract `toolkit_commit` and `last_sync` timestamps

### Phase 2: Detect Activity Status

For each project, classify its activity level:

```bash
detect_activity() {
  local project_path="$1"

  # ACTIVE: Has uncommitted changes
  if [ -n "$(git -C "$project_path" status --porcelain 2>/dev/null)" ]; then
    echo "ACTIVE"
    return
  fi

  # RECENT: Files modified in last 24 hours
  if find "$project_path" -maxdepth 3 -type f -mtime -1 \
       -not -path '*/node_modules/*' \
       -not -path '*/.git/*' \
       -not -name '*.log' 2>/dev/null | head -1 | grep -q .; then
    echo "RECENT"
    return
  fi

  echo "DORMANT"
}
```

**Activity Classifications:**

| Status | Meaning | Default Action |
|--------|---------|----------------|
| `ACTIVE` | Uncommitted git changes | Skip (ask first) |
| `RECENT` | Modified in last 24h | Include with note |
| `DORMANT` | No recent activity | Safe to sync |

### Phase 3: Check Sync Status

Compare each project's `toolkit_commit` against current toolkit HEAD:

```bash
# Project needs sync if:
# 1. toolkit_commit differs from current HEAD, AND
# 2. Skills changed between those commits

LAST_COMMIT="<from toolkit-version.json>"
CURRENT_COMMIT=$(git rev-parse HEAD)

if [ "$LAST_COMMIT" != "$CURRENT_COMMIT" ]; then
  # Check if skills actually changed
  SKILL_CHANGES=$(git diff --name-only "$LAST_COMMIT".."$CURRENT_COMMIT" -- .claude/skills 2>/dev/null | wc -l)
  if [ "$SKILL_CHANGES" -gt 0 ]; then
    echo "OUTDATED"
  else
    echo "CURRENT"
  fi
else
  echo "CURRENT"
fi
```

### Phase 4: Display Status

Show a formatted table of all discovered projects:

```
TOOLKIT PROJECT STATUS
======================
Toolkit: /Users/you/Projects/ai_coding_project_base
Current: abc1234 (2026-01-23)

Found N toolkit-using projects:

  #  Project                       Sync Status   Last Sync     Activity
  ─────────────────────────────────────────────────────────────────────
  1  ~/Projects/my-app             OUTDATED      3 days ago    DORMANT
  2  ~/Projects/api-service        OUTDATED      1 week ago    ACTIVE
  3  ~/Projects/dashboard          CURRENT       today         -
  4  ~/Projects/ml-pipeline        OUTDATED      2 weeks ago   RECENT

Legend:
  Sync Status: OUTDATED = needs sync, CURRENT = up to date
  Activity:    ACTIVE = uncommitted changes, RECENT = modified today, DORMANT = idle
```

### Phase 5: User Selection

If there are OUTDATED projects, prompt the user:

```
Which projects should I sync?

Options:
1. Sync all DORMANT projects (N projects)     [Recommended]
   Safe batch sync - skips projects with uncommitted changes

2. Select specific projects
   Choose which projects to sync individually

3. Include ACTIVE projects too
   Will ask for confirmation before syncing each active project

4. Skip for now
   Exit without syncing - run /sync manually later
```

Use `AskUserQuestion` for the selection.

**If user selects "Include ACTIVE projects":**

For each ACTIVE project, show a separate confirmation:

```
Project: ~/Projects/api-service
Status: ACTIVE (uncommitted changes)

This project has uncommitted git changes:
  M src/api/handlers.ts
  M tests/api.test.ts
  ?? src/api/new-file.ts

Syncing will update skill files but won't affect your uncommitted changes.

Options:
1. Sync anyway
2. Skip this project
3. Show full git status
```

### Phase 6: Execute Sync

For each selected project, run the sync process:

```
SYNCING PROJECTS
================

[1/3] ~/Projects/my-app
      Checking files...
      Copying skills...
      Updating toolkit-version.json...
      Done (5 files updated)

[2/3] ~/Projects/dashboard
      Already up to date

[3/3] ~/Projects/api-service
      SKIPPED (active project)

─────────────────────────────────────────────────────────────────────
```

**Sync Logic (for each project):**

1. Change working context to target project
2. For each skill in the sync list, compare hashes:
   - If toolkit hash = target hash: skip (current)
   - If target missing: copy from toolkit (new)
   - If target = last-synced hash: copy from toolkit (clean update)
   - If target differs from last-synced: report conflict (ask user)
3. Update `toolkit-version.json` with new commit and hashes

**Skills to sync:**
- fresh-start
- phase-prep
- phase-start
- phase-checkpoint
- verify-task
- configure-verification
- progress
- populate-state
- list-todos
- security-scan
- criteria-audit
- code-verification
- spec-verification
- browser-verification
- tech-debt-check
- auto-verify

### Phase 7: Summary Report

```
SYNC COMPLETE
=============

Projects processed: 4
  Synced:    2 (my-app, ml-pipeline)
  Skipped:   1 (api-service - active)
  Current:   1 (dashboard)

Files updated: 12
Conflicts:     0

All synced projects are now at toolkit commit abc1234 (2026-01-23)
```

## Edge Cases

### No Projects Found

```
No toolkit-using projects found in ~/Projects

To set up a project with this toolkit:
1. Navigate to your project directory
2. Run /setup or /generate-plan

To search additional paths, set:
  export TOOLKIT_SEARCH_PATH="~/Projects:~/work"
```

### Project Points to Different Toolkit

Skip silently - it's using a different toolkit installation.

### Git Not Available in Project

```
Warning: ~/Projects/legacy-app is not a git repository
  Cannot detect activity status - treating as DORMANT
```

### Sync Conflicts

If a project has local modifications to skills that differ from both the last-synced version AND the toolkit version, follow the standard `/sync` conflict resolution flow (backup local, overwrite, or skip).
