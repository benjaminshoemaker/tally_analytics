# Tinybird Dashboard Pending Tasks Migration

This note documents the additive Tinybird schema update required for Task `1.2.B`.

## Staging Gate

Run this in the Tinybird **staging** workspace first. Do not apply production changes before staging verification is complete.

```bash
tb datasource alter events --add-column "environment LowCardinality(String) `json:$.environment`"
tb datasource alter events --add-column "event_properties Nullable(String) `json:$.event_properties`"
```

## Verification Query

Run this after both alter commands:

```bash
tb sql "SELECT environment, event_properties, event_type, timestamp FROM events ORDER BY timestamp DESC LIMIT 5"
```

Expected output:
- Query succeeds without schema errors.
- Result columns include `environment` and `event_properties`.
- Existing rows still return for `event_type` and `timestamp`.

## Production Gate

Production is **blocked** until the staging run succeeds and a verification result is recorded.
production blocked until staging verification result is recorded.

## Verification Result

Record this before production apply:
- Date/time:
- Workspace:
- Operator:
- `tb datasource alter` output summary:
- `tb sql` output summary:
- Follow-up notes:
