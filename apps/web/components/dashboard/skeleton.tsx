import React from "react";

type SkeletonProps = {
  className?: string;
  style?: React.CSSProperties;
};

export default function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={[
        "animate-pulse rounded bg-slate-200",
        className,
      ].join(" ")}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <Skeleton className="h-4 w-20" />
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="h-64 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <Skeleton className="h-4 w-24" />
      <div className="mt-3 flex h-52 items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${Math.random() * 60 + 20}%` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <Skeleton className="h-4 w-24" />
      <div className="mt-3 flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
