# MCP OAuth Migration Notes

Task: 1.1.B
Date: 2026-05-07

## Generation

- Attempted `pnpm --filter web db:generate -- --name mcp_oauth`, but pnpm forwarded the literal `--` and Drizzle rejected the option shape.
- Ran the equivalent generated-migration command `pnpm --filter web exec drizzle-kit generate --name mcp_oauth`.
- The generated file was `apps/web/drizzle/migrations/0006_mcp_oauth.sql`.
- The generated Drizzle SQL initially recreated existing tables because this repository did not have prior migration snapshots. I kept the generated journal/snapshot metadata and rewrote `0006_mcp_oauth.sql` to the additive migration required by the plan.

## SQL review

SQL review confirmed the final migration:

- Backfills `projects.display_name` from `projects.github_repo_full_name`.
- Drops not-null constraints from `github_repo_id`, `github_repo_full_name`, and `github_installation_id`.
- Adds MCP project metadata columns, `projects_source_check`, `idx_projects_source`, `idx_projects_mcp_fingerprint`, and the partial unique index on `(user_id, mcp_fingerprint)`.
- Adds `oauth_clients`, `oauth_authorization_codes`, `oauth_access_tokens`, and `oauth_refresh_tokens`.
- Uses `code_hash` and `token_hash` primary keys for OAuth code/token storage.
- Does not drop existing project, user, or GitHub token tables.
- Does not drop GitHub project columns.

## Local application

- Ran `pnpm --filter web db:push`.
- Result: migrations applied successfully.

## Post-apply tests

- Ran `pnpm --filter web test -- schema migrations`.
- Result: 3 test files passed, 16 tests passed.
