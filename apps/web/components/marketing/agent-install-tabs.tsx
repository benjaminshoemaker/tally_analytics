"use client";

import React, { useState } from "react";

type AgentTab = {
  id: string;
  label: string;
  description: string;
  command: string;
  note: string;
};

const AGENT_TABS: AgentTab[] = [
  {
    id: "claude",
    label: "Claude Code",
    description: "Add Tally as a remote HTTP MCP server in Claude Code.",
    command: "claude mcp add --transport http tally https://usetally.xyz/api/mcp",
    note: "Then ask Claude Code to add Tally Analytics to your app.",
  },
  {
    id: "codex",
    label: "Codex",
    description: "Add the hosted Tally MCP server from the Codex CLI.",
    command: "codex mcp add tally --url https://usetally.xyz/api/mcp",
    note: "Then ask Codex to install analytics and run local verification.",
  },
  {
    id: "cursor",
    label: "Cursor",
    description: "Add Tally to Cursor's MCP configuration.",
    command: '{\n  "mcpServers": {\n    "tally": {\n      "url": "https://usetally.xyz/api/mcp"\n    }\n  }\n}',
    note: "Save the config, authenticate when prompted, then ask Cursor to install Tally.",
  },
  {
    id: "generic",
    label: "Your agent",
    description: "Use any MCP-capable coding agent that supports remote HTTP servers and OAuth.",
    command: "https://usetally.xyz/api/mcp",
    note: "Add this as the Tally MCP server URL, then ask your agent to install analytics.",
  },
];

export default function AgentInstallTabs({ compact = false }: { compact?: boolean }) {
  const idPrefix = React.useId();
  const [activeId, setActiveId] = useState(AGENT_TABS[0].id);
  const active = AGENT_TABS.find((tab) => tab.id === activeId) ?? AGENT_TABS[0];

  return (
    <div className="rounded-xl border border-warm-200 bg-white p-3 shadow-warm">
      <div
        role="tablist"
        aria-label="Choose coding agent"
        className="grid grid-cols-2 gap-1 rounded-lg bg-warm-100 p-1 md:grid-cols-4"
      >
        {AGENT_TABS.map((tab) => (
          <button
            key={tab.id}
            id={`${idPrefix}-${tab.id}-tab`}
            role="tab"
            type="button"
            aria-selected={active.id === tab.id}
            aria-controls={`${idPrefix}-${tab.id}-panel`}
            className={
              active.id === tab.id
                ? "min-h-11 rounded-md bg-white px-3 py-2 text-xs font-semibold text-warm-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-warm-100"
                : "min-h-11 rounded-md px-3 py-2 text-xs font-semibold text-warm-500 outline-none transition-colors hover:bg-white/60 hover:text-warm-900 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-warm-100"
            }
            onClick={() => setActiveId(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={`${idPrefix}-${active.id}-panel`}
        role="tabpanel"
        aria-labelledby={`${idPrefix}-${active.id}-tab`}
        className={compact ? "mt-3" : "mt-4"}
      >
        <p className="text-xs font-medium text-warm-600">{active.description}</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-warm-900 px-4 py-3 text-left text-xs font-medium leading-relaxed text-warm-50 shadow-inner">
          <code>{active.command}</code>
        </pre>
        {!compact && <p className="mt-3 text-xs leading-relaxed text-warm-500">{active.note}</p>}
      </div>
    </div>
  );
}
