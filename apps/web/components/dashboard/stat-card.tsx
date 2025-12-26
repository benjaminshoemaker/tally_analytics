import React from "react";

export default function StatCard({ label, value, change }: { label: string; value: string; change: number }) {
  const changeLabel = change === 0 ? "0%" : `${change > 0 ? "+" : ""}${change}%`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-sm text-slate-600">{changeLabel}</p>
      </div>
    </div>
  );
}

