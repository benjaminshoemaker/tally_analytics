import React from "react";

type StatusConfig = {
  label: string;
  className: string;
};

const STATUS_MAP: Record<string, StatusConfig> = {
  active: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  pending_pr: {
    label: "PR Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  pending_analysis: {
    label: "Analyzing",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  analysis_failed: {
    label: "Failed",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  pr_closed: {
    label: "PR Closed",
    className: "bg-slate-50 text-slate-600 border-slate-200",
  },
  unsupported: {
    label: "Unsupported",
    className: "bg-slate-50 text-slate-600 border-slate-200",
  },
};

const DEFAULT_CONFIG: StatusConfig = {
  label: "Unknown",
  className: "bg-slate-50 text-slate-600 border-slate-200",
};

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? DEFAULT_CONFIG;
  const displayLabel = STATUS_MAP[status] ? config.label : status;

  return (
    <span
      className={[
        "inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
      ].join(" ")}
    >
      {displayLabel}
    </span>
  );
}
