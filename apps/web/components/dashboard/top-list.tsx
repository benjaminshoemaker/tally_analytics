import React from "react";

type TopListItem = { label: string; value: number; percentage: number };

export default function TopList({ title, items }: { title: string; items: TopListItem[] }) {
  return (
    <section className="rounded-lg border border-warm-200 bg-white p-4 shadow-warm transition-shadow hover:shadow-warm-md">
      <h2 className="text-sm font-semibold text-warm-900">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-warm-500">No data yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {items.map((item, index) => (
            <li
              key={item.label}
              className="group relative flex items-center gap-3 text-sm"
            >
              <div
                className="absolute inset-y-0 left-0 rounded bg-brand-500/10 transition-all group-hover:bg-brand-500/15"
                style={{ width: `${item.percentage}%` }}
              />
              <span className="relative z-10 flex-1 truncate text-warm-800 transition-colors group-hover:text-warm-900">
                {item.label}
              </span>
              <span className="relative z-10 whitespace-nowrap text-xs font-medium text-warm-500">
                {item.value.toLocaleString()}
                <span className="ml-1 text-warm-400">({item.percentage}%)</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

