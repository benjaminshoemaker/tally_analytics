import React from "react";

type TopListItem = { label: string; value: number; percentage: number };

function RankBadge({ rank }: { rank: number }) {
  const isTop3 = rank <= 3;

  const colors = {
    1: "bg-amber-100 text-amber-700 border-amber-200",
    2: "bg-warm-100 text-warm-600 border-warm-200",
    3: "bg-orange-50 text-orange-600 border-orange-200",
  } as const;

  if (isTop3) {
    return (
      <span className={`flex size-5 items-center justify-center rounded-full border text-[10px] font-bold ${colors[rank as 1 | 2 | 3]}`}>
        {rank}
      </span>
    );
  }

  return (
    <span className="flex size-5 items-center justify-center text-xs font-medium text-warm-400">
      {rank}
    </span>
  );
}

export default function TopList({ title, items }: { title: string; items: TopListItem[] }) {
  return (
    <section className="rounded-lg border border-warm-200 bg-white p-4 shadow-warm transition-shadow hover:shadow-warm-md">
      <h2 className="font-display text-sm font-semibold text-warm-900">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-warm-500">No data yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;

            return (
              <li
                key={item.label}
                className={`group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-all ${
                  isTop3 ? "hover:bg-warm-50" : ""
                }`}
              >
                <RankBadge rank={rank} />
                <div className="relative flex-1 min-w-0">
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-brand-500/10 transition-all group-hover:bg-brand-500/15"
                    style={{ width: `${item.percentage}%` }}
                  />
                  <span className={`relative z-10 block truncate transition-colors ${
                    isTop3 ? "font-medium text-warm-900" : "text-warm-700"
                  } group-hover:text-warm-900`}>
                    {item.label}
                  </span>
                </div>
                <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-warm-500">
                  <span className={isTop3 ? "text-warm-700" : ""}>{item.value.toLocaleString()}</span>
                  <span className="text-warm-400">({item.percentage}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

