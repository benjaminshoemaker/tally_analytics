# Local Environment

Use the repo-root `.env.local` as the canonical local environment file.

App-local files should not be independent copies:

- `apps/web/.env.local`
- `apps/events/.env.local`

Those files should either be absent or symlinked to `../../.env.local`.

Why this matters:

- Next.js apps look for env files from their app directories.
- Repo scripts and Drizzle also load env files directly.
- Separate copies drift easily, especially for `DATABASE_URL`, `PORT`, and `NEXT_PUBLIC_APP_URL`.
- OAuth redirects require `PORT` and `NEXT_PUBLIC_APP_URL` to agree.

Check the local setup:

```bash
pnpm env:check
```

Useful local defaults:

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres
PORT=4329
NEXT_PUBLIC_APP_URL=http://localhost:4329
```

The MCP and browser E2E harnesses may override these values for isolated runs. For example, MCP harnesses start `apps/web` on port `3000` with explicit environment variables.

The events app uses the same root env file, but its dev script pins the service to port `3001`.
