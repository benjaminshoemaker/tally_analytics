# State Tracking

Maintain `.claude/phase-state.json` throughout execution.

## State Updates

### At Phase Start

```bash
mkdir -p .claude
```

Set phase status to `IN_PROGRESS` with `started_at` timestamp and `execution_mode`:

```json
{
  "status": "IN_PROGRESS",
  "started_at": "{ISO timestamp}",
  "execution_mode": "default | codex"
}
```

### After Each Task Completion

Update the task entry:

```json
{
  "tasks": {
    "{task_id}": {
      "status": "COMPLETE",
      "completed_at": "{ISO timestamp}"
    }
  }
}
```

### If Task is Blocked

Record the blocker:

```json
{
  "tasks": {
    "{task_id}": {
      "status": "BLOCKED",
      "blocker": "{description}",
      "blocker_type": "user-action|dependency|external-service|unclear-requirements",
      "since": "{ISO timestamp}"
    }
  }
}
```

## State File Format

Create if missing:

```json
{
  "schema_version": "1.0",
  "project_name": "{directory name}",
  "last_updated": "{ISO timestamp}",
  "main": {
    "current_phase": 1,
    "total_phases": 6,
    "status": "IN_PROGRESS",
    "phases": [
      {
        "number": 1,
        "name": "{Phase Name}",
        "status": "IN_PROGRESS",
        "started_at": "{ISO timestamp}",
        "tasks": {}
      }
    ]
  }
}
```

If `.claude/phase-state.json` doesn't exist, run `/populate-state` first to initialize it.
