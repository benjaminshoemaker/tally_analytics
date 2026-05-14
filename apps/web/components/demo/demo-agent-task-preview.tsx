import React from "react";

import type { PublicDemoAgentPreview, PublicDemoTaskPreview } from "../../lib/demo/public-demo-data";

export default function DemoAgentTaskPreview({
  agentPreview,
  task,
}: {
  agentPreview: PublicDemoAgentPreview;
  task: PublicDemoTaskPreview;
}) {
  return (
    <section className="rounded-lg border border-brand-200 bg-brand-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Simulated MCP/agent output
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-warm-950">{task.title}</h3>
          <p className="mt-2 text-sm text-warm-700">{task.why}</p>
        </div>
        <code className="rounded-md border border-brand-200 bg-white px-3 py-2 font-mono text-sm text-brand-800">
          {task.eventName}
        </code>
      </div>

      <div className="mt-4 rounded-md border border-warm-200 bg-white p-3">
        <p className="text-sm font-medium text-warm-900">{agentPreview.summary}</p>
        <p className="mt-2 text-sm text-warm-700">{agentPreview.taskDescription}</p>
        <ul className="mt-3 space-y-1 text-sm text-warm-700">
          {agentPreview.verificationCriteria.map((criterion) => (
            <li key={criterion}>- {criterion}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
