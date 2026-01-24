---
description: Configure verification commands for this project
argument-hint: [project-directory]
allowed-tools: Read, Edit, Grep, Glob, Bash, AskUserQuestion
---

Configure `.claude/verification-config.json` with the project's actual commands
for tests, lint, typecheck, build, coverage, dev server, and authentication.

## Project Directory

Use the current working directory by default.

If `$1` is provided, treat `$1` as the working directory and read files under
`$1` instead.

## Context Detection

Determine working context:

1. If the working directory matches `*/features/*`:
   - PROJECT_ROOT = parent of parent of working directory
2. Otherwise:
   - PROJECT_ROOT = working directory

## Directory Guard

Confirm `PROJECT_ROOT` exists and is writable. If not, stop and ask for a valid
project directory.

## Check Browser Tool Availability

Before configuring, verify that browser verification tools are available.
Attempt harmless calls to detect installed MCPs (in priority order):

| Tool | Check Method | Install Instructions |
|------|--------------|---------------------|
| ExecuteAutomation Playwright | Check for `mcp__playwright__*` or `mcp__executeautomation__*` tools | `npx -y @executeautomation/playwright-mcp-server` |
| Browser MCP | Check for `mcp__browsermcp__*` tools | Install extension from browsermcp.io |
| Microsoft Playwright MCP | Check for `mcp__playwright__*` tools | `npx -y @anthropic-ai/mcp-server-playwright` |
| Chrome DevTools MCP | Call `mcp__chrome-devtools__list_pages` | Often pre-installed |

**Report availability:**

```
BROWSER TOOLS (in fallback order)
=================================
ExecuteAutomation Playwright: Available | Not detected  (recommended)
Browser MCP Extension: Available | Not detected
Microsoft Playwright MCP: Available | Not detected
Chrome DevTools MCP: Available | Not detected

{If none available}
WARNING: No browser MCP tools detected.
Browser verification will require manual verification.

To enable automated browser verification, add to .claude/settings.json:

{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    }
  }
}

NOTE: Avoid @playwright/mcp@latest — it includes unstable betas.
Use @executeautomation/playwright-mcp-server for stability.
```

Continue with configuration even if no browser tools are available (browser
verification will fall back to manual).

## Discovery (Read-Only)

Scan project documentation for commands and hints:
- `README.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `Makefile`
- `Taskfile.yml`
- `justfile`
- Any `docs/` or `scripts/` usage notes

Look for sections mentioning: tests, linting, type checking, build, coverage,
local dev server, authentication, and login routes.

Summarize any candidate commands you find.

## Configure Commands

If `.claude/verification-config.json` does not exist, create it with empty
fields. Then ask the human to confirm or provide commands for:

- Test command
- Lint command
- Typecheck command (if applicable)
- Build command (if applicable)
- Coverage command (if applicable)
- Dev server command + URL + startup wait

If a command is not applicable, set it to an empty string and note it as
"not applicable" in the summary.

## Configure Authentication

Ask the human about authentication requirements:

1. "Does your app require login for browser verification?"
   - If NO: Set `auth.strategy` to `"none"` and skip remaining auth questions
   - If YES: Continue with auth configuration

2. "What is the login route?" (default: `/login`)
   - Set `auth.loginRoute`

3. "What environment variable holds the test username/email?"
   - Default: `TEST_USER_EMAIL`
   - Set `auth.credentials.usernameVar`

4. "What environment variable holds the test password?"
   - Default: `TEST_USER_PASSWORD`
   - Set `auth.credentials.passwordVar`

5. Set `auth.strategy` to `"env"` and `auth.storageState` to
   `.claude/verification/auth-state.json`

## Ensure .gitignore Protection

If authentication is configured, verify `.env.verification` won't be committed:

1. Check if `.gitignore` exists in PROJECT_ROOT
2. Check if `.env.verification` is already listed
3. If not listed, **automatically add it**:

```bash
# Add to .gitignore if not present
if ! grep -q "^\.env\.verification$" .gitignore 2>/dev/null; then
  echo "" >> .gitignore
  echo "# Verification credentials (never commit)" >> .gitignore
  echo ".env.verification" >> .gitignore
  echo "Added .env.verification to .gitignore"
fi
```

4. Also ensure `.claude/verification/auth-state.json` is ignored:

```bash
if ! grep -q "\.claude/verification/auth-state\.json" .gitignore 2>/dev/null; then
  echo ".claude/verification/auth-state.json" >> .gitignore
  echo "Added auth-state.json to .gitignore"
fi
```

**CRITICAL:** If `.gitignore` doesn't exist and auth is configured, create it
with these entries before proceeding.

## Write Config

Update `.claude/verification-config.json` with all confirmed values.

Set `browser.tool` to `"auto"` (no user prompt needed — the browser-verification
skill will automatically detect and use the best available tool).

## Report

```
VERIFICATION CONFIGURED
=======================
Project Root: {path}

Browser Tools (in fallback order):
- ExecuteAutomation Playwright: {Available | Not detected} (recommended)
- Browser MCP Extension: {Available | Not detected}
- Microsoft Playwright MCP: {Available | Not detected}
- Chrome DevTools MCP: {Available | Not detected}

Commands:
- test: {value or ""}
- lint: {value or ""}
- typecheck: {value or ""}
- build: {value or ""}
- coverage: {value or ""}

Dev Server:
- command: {value or ""}
- url: {value or ""}
- startupSeconds: {value}

Authentication:
- strategy: {none | env}
- loginRoute: {value or "N/A"}
- usernameVar: {value or "N/A"}
- passwordVar: {value or "N/A"}

Git Protection:
- .gitignore includes .env.verification: {Yes | Added | WARNING: No .gitignore}

Status: READY | READY WITH NOTES
Notes: {missing commands, auth setup needed, no browser tools, etc.}
```

## Post-Configuration Reminders

If authentication was configured:

```
AUTHENTICATION SETUP REQUIRED
=============================
1. Copy .env.verification.example to .env.verification
2. Fill in TEST_USER_EMAIL and TEST_USER_PASSWORD
3. Verify .env.verification is in .gitignore (should be auto-added)
4. Run a browser verification to test login works
```

If no browser tools detected:

```
BROWSER VERIFICATION NOTE
=========================
No browser MCP tools were detected. Browser-based acceptance criteria
will require manual verification until a browser MCP is configured.

Recommended: Add Playwright MCP to your Claude settings.
```
