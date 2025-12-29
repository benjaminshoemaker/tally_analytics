import React from "react";

export default function StatCard({ label, value, change }: { label: string; value: string; change: number }) {
  const changeLabel = change === 0 ? "0%" : `${change > 0 ? "+" : ""}${change}%`;
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className="group relative overflow-hidden rounded-lg border border-warm-200 bg-white p-4 shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-warm-md">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-500 to-brand-400 opacity-0 transition-opacity group-hover:opacity-100" />
      <p className="text-sm font-medium text-warm-500">{label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className="font-display text-2xl font-semibold text-warm-900">{value}</p>
        <p className={`flex items-center gap-1 text-sm font-medium ${
          isPositive ? "text-emerald-600" : isNegative ? "text-red-500" : "text-warm-500"
        }`}>
          {isPositive && (
            <svg className="size-3.5" viewBox="0 0 16 16" fill="none">
              <path d="M8 12V4M8 4L4 8M8 4L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {isNegative && (
            <svg className="size-3.5" viewBox="0 0 16 16" fill="none">
              <path d="M8 4V12M8 12L4 8M8 12L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {changeLabel}
        </p>
      </div>
    </div>
  );
}

