import React from "react";

import type { AnalyticsTaskStatus } from "../../../lib/analytics/tasks/types";

const STATUS_LABELS: Record<AnalyticsTaskStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  implemented_locally: "Implemented locally",
  awaiting_deploy: "Awaiting deploy",
  verified: "Verified",
  failed: "Failed",
  cancelled: "Cancelled",
  archived: "Archived",
  duplicate: "Duplicate",
};

const STATUS_CLASSES: Record<AnalyticsTaskStatus, string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  implemented_locally: "border-violet-200 bg-violet-50 text-violet-700",
  awaiting_deploy: "border-amber-200 bg-amber-50 text-amber-700",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
  archived: "border-slate-200 bg-slate-100 text-slate-600",
  duplicate: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function TaskStatusBadge({ status }: { status: AnalyticsTaskStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
      ].join(" ")}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
