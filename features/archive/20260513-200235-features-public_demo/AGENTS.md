# Public Demo Feature Notes

Read the project root `AGENTS.md` first, then this file.

## Current Authority

This feature is planned until the human explicitly starts work on it. Do not
supersede another active workstream just because this folder exists.

## Starting Point

Begin with `FEATURE_BRIEF.md`.

The intended direction is a public `/demo` route that reuses dashboard
presentation where practical, uses fixture-backed fake data, and simulates Ask
Tally/MCP behavior locally in the UI without anonymous production writes or
public MCP access.

## Guardrails

- Keep the demo public and account-free.
- Do not make authenticated dashboard APIs public for demo convenience.
- Do not create anonymous real projects or demo users in production.
- Keep MCP behavior explicitly simulated.
- Preserve clear copy that the data is fake.
