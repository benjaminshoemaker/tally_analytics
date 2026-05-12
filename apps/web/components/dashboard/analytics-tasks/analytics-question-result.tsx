import React from "react";

import type { AnalyticsQuestionResult } from "../../../lib/analytics/tasks/types";

type Props = {
  result: AnalyticsQuestionResult | null;
};

export default function AnalyticsQuestionResult({ result }: Props) {
  if (!result) return null;

  if (result.kind === "answered") {
    return (
      <section aria-live="polite" className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
        <p className="text-sm font-medium text-emerald-900">{result.answer.summary}</p>
        {result.answer.metrics.length > 0 && (
          <ul className="mt-2 grid gap-1 text-sm text-emerald-800">
            {result.answer.metrics.map((metric) => (
              <li key={metric.label} className="flex items-center justify-between gap-4">
                <span>{metric.label}</span>
                <span className="font-semibold">{String(metric.value)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  if (result.kind === "unsupported") {
    return (
      <section aria-live="polite" className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm font-medium text-amber-900">{result.answer.summary}</p>
        {result.answer.narrowingPrompt && (
          <p className="mt-1 text-sm text-amber-800">{result.answer.narrowingPrompt}</p>
        )}
      </section>
    );
  }

  return (
    <section aria-live="polite" className="rounded-md border border-blue-200 bg-blue-50 p-3">
      <p className="text-sm font-medium text-blue-900">{result.answer.summary}</p>
      <p className="mt-1 text-sm text-blue-800">{result.answer.limitation}</p>
    </section>
  );
}
