# Codex CLI Skill Pack Sync

## Check Codex Installation

```bash
CODEX_SKILLS_DIR="${CODEX_HOME:-$HOME/.codex}/skills"
TOOLKIT_SKILLS_DIR="$(pwd)/.claude/skills"

# Dynamically discover all skills from toolkit directory
CODEX_SKILLS=($(ls -1 "$TOOLKIT_SKILLS_DIR" | grep -v "^\\."))
```

**Note:** Skills are discovered dynamically from the toolkit's `.claude/skills/` directory.

## Status Classification

For each skill, determine its status:

```bash
check_codex_skill() {
  local skill_name="$1"
  local codex_path="$CODEX_SKILLS_DIR/$skill_name"
  local toolkit_path="$TOOLKIT_SKILLS_DIR/$skill_name"

  if [[ ! -e "$codex_path" ]]; then
    echo "MISSING"
  elif [[ -L "$codex_path" ]]; then
    local target=$(readlink "$codex_path")
    if [[ "$target" == "$toolkit_path" || "$target" == *"/.claude/skills/$skill_name" ]]; then
      echo "SYMLINK_CURRENT"
    else
      echo "SYMLINK_OTHER"
    fi
  else
    if diff -rq "$codex_path" "$toolkit_path" >/dev/null 2>&1; then
      echo "COPY_CURRENT"
    else
      echo "COPY_OUTDATED"
    fi
  fi
}
```

| Status | Meaning | Action |
|--------|---------|--------|
| `MISSING` | Skill not installed | Offer to install |
| `SYMLINK_CURRENT` | Symlink to this toolkit | No action needed |
| `SYMLINK_OTHER` | Symlink to different toolkit | Skip |
| `COPY_CURRENT` | Copy, content matches | No action needed |
| `COPY_OUTDATED` | Copy, content differs | Offer to update |

## Sync Logic

```bash
sync_codex_skill() {
  local skill_name="$1"
  local status="$2"
  local codex_path="$CODEX_SKILLS_DIR/$skill_name"
  local toolkit_path="$TOOLKIT_SKILLS_DIR/$skill_name"

  case "$status" in
    MISSING|COPY_OUTDATED)
      rm -rf "$codex_path" 2>/dev/null || true
      cp -R "$toolkit_path" "$codex_path"
      echo "UPDATED"
      ;;
    SYMLINK_CURRENT|COPY_CURRENT)
      echo "CURRENT"
      ;;
    SYMLINK_OTHER)
      echo "SKIPPED"
      ;;
  esac
}
```

## Status Display

```
CODEX CLI SKILL PACK
────────────────────
Location: ~/.codex/skills
Status:   OUTDATED (3 skills need updating)

  Skill                  Status
  ──────────────────────────────────────
  fresh-start            SYMLINK_CURRENT
  phase-start            COPY_OUTDATED    ← needs update
  verify-task            MISSING          ← needs install
```

**If all symlinks:**
```
Status: CURRENT (all symlinks - auto-updating)
All {N} skills are symlinked to this toolkit. No sync needed.
```

**If not installed:**
```
Status: DIRECTORY NOT FOUND
To install: ./scripts/install-codex-skill-pack.sh
```
