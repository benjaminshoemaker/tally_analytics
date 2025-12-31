import React from "react";

function ActiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="3" fill="currentColor" />
    </svg>
  );
}

function PendingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
    </svg>
  );
}

function AnalyzingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="7 5" className="animate-spin origin-center" style={{ animationDuration: "1.5s" }} />
    </svg>
  );
}

function FailedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none">
      <path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ClosedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none">
      <path d="M3 6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type StatusConfig = {
  label: string;
  className: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STATUS_MAP: Record<string, StatusConfig> = {
  active: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: ActiveIcon,
  },
  pending: {
    label: "Pending",
    className: "bg-slate-50 text-slate-600 border-slate-200",
    icon: PendingIcon,
  },
  pr_pending: {
    label: "PR Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: PendingIcon,
  },
  analyzing: {
    label: "Analyzing",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: AnalyzingIcon,
  },
  analysis_failed: {
    label: "Failed",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: FailedIcon,
  },
  pr_closed: {
    label: "PR Closed",
    className: "bg-slate-100 text-slate-500 border-slate-200",
    icon: ClosedIcon,
  },
  unsupported: {
    label: "Unsupported",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: FailedIcon,
  },
};

const DEFAULT_CONFIG: StatusConfig = {
  label: "Unknown",
  className: "bg-warm-100 text-warm-600 border-warm-200",
  icon: ClosedIcon,
};

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? DEFAULT_CONFIG;
  const displayLabel = STATUS_MAP[status] ? config.label : status;
  const Icon = config.icon;

  return (
    <span
      className={[
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        config.className,
      ].join(" ")}
    >
      <Icon className="size-3" />
      {displayLabel}
    </span>
  );
}
