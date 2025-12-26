import React from "react";

type TopListItem = { label: string; value: number; percentage: number };

export default function TopList({ title, items }: { title: string; items: TopListItem[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-700">No data yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-3 text-sm text-slate-800">
              <span className="truncate">{item.label}</span>
              <span className="whitespace-nowrap text-xs text-slate-600">
                {item.value} ({item.percentage}%)
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

