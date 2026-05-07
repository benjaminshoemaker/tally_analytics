# Browser Tool Reference

Detailed notes on each browser MCP tool option.

## ExecuteAutomation Playwright MCP (Recommended Primary)

- Package: `@executeautomation/playwright-mcp-server`
- Most stable option, actively maintained (312+ commits)
- 143 device presets for responsive testing
- Cross-browser support (Chrome, Firefox, Safari)
- Install: Add to `.claude/settings.json` mcpServers:
  ```json
  {
    "mcpServers": {
      "playwright": {
        "command": "npx",
        "args": ["-y", "@executeautomation/playwright-mcp-server"]
      }
    }
  }
  ```

## Browser MCP (Best for Auth-Heavy Apps)

- Source: [browsermcp.io](https://browsermcp.io/)
- Uses your existing browser profile (stays logged in to services)
- Local execution (no network latency, better privacy)
- Bot-detection resistant (uses real browser fingerprint)
- Requires: Browser MCP Chrome extension installed
- Best for: Apps where maintaining login sessions matters

## Microsoft Playwright MCP (Use Pinned Version)

- Package: `@anthropic-ai/mcp-server-playwright` (recommended)
- Official implementation with accessibility tree support
- **AVOID** `@playwright/mcp@latest` — includes unstable betas causing "undefined" errors
- If you must use Microsoft's version, pin to a specific stable version

## Chrome DevTools MCP (Basic Fallback)

- Often pre-installed with Claude Code
- Good for debugging and simple automation
- Use `mcp__chrome-devtools__*` tools
- **Limitations:** Not designed for complex automation, less stable for multi-step workflows
- Best for: Quick screenshots, simple navigation, debugging

## Browserbase + Stagehand (Cloud Option)

- Package: `@browserbasehq/mcp-server-browserbase`
- Cloud-hosted browsers (no local browser needed)
- Stealth mode, proxy support, concurrent sessions
- Requires: Browserbase API key (external service)
- Best for: CI/CD pipelines, high-volume testing, anti-detection needs
