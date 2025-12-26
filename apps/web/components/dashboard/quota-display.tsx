import React from "react";

export default function QuotaDisplay({ used, limit, isOverQuota }: { used: number; limit: number; isOverQuota: boolean }) {
  const safeLimit = limit > 0 ? limit : 1;
  const rawPercent = Math.round((used / safeLimit) * 100);
  const percent = Math.max(0, Math.min(100, rawPercent));
  const showWarning = !isOverQuota && percent >= 80;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Quota</h2>

      {isOverQuota ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>Over quota.</strong> Events are still collected, but your dashboard may be limited until you upgrade.
        </div>
      ) : showWarning ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
          You’re at <strong>{percent}%</strong> of your monthly quota.
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-4 text-sm text-slate-700">
        <span>Usage</span>
        <span className="tabular-nums">
          {used} / {limit}
        </span>
      </div>

      <div className="mt-2 h-2 w-full rounded bg-slate-200">
        <div className="h-2 rounded bg-slate-900" style={{ width: `${percent}%` }} />
      </div>

      <p className="mt-2 text-xs text-slate-600">{percent}%</p>
    </section>
  );
}

