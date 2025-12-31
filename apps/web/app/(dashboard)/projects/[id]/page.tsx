"use client";

import React, { useEffect, useMemo, useState } from "react";

import OnboardingChecklist from "../../../../components/dashboard/onboarding-checklist";
import QuotaDisplay from "../../../../components/dashboard/quota-display";
import Skeleton, { SkeletonList } from "../../../../components/dashboard/skeleton";
import StatusBadge from "../../../../components/dashboard/status-badge";
import { useProject } from "../../../../lib/hooks/use-project";
import type { UserPlan } from "../../../../lib/stripe/plans";

type RegenerateState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  retryAfter?: number;
};

function canRegenerate(status: string): boolean {
  return status === "analysis_failed" || status === "pr_closed" || status === "unsupported";
}

function shouldShowQuota(status: string): boolean {
  return status === "pr_pending" || status === "active";
}

type StatusCardConfig = {
  title: string;
  description: string;
  bgClass: string;
  borderClass: string;
  iconClass: string;
};

const STATUS_CARD_CONFIG: Record<string, StatusCardConfig> = {
  unsupported: {
    title: "Repository Not Supported",
    description:
      "This repository may use an unsupported framework or structure. Click 'Re-run Analysis' to try again after making changes to your repository.",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
    iconClass: "text-amber-500",
  },
  analysis_failed: {
    title: "Analysis Failed",
    description:
      "Something went wrong during analysis. This could be a temporary issue. Click 'Re-run Analysis' to try again.",
    bgClass: "bg-red-50",
    borderClass: "border-red-200",
    iconClass: "text-red-500",
  },
  pr_closed: {
    title: "Pull Request Closed",
    description:
      "The analytics PR was closed without merging. Click 'Re-run Analysis' to generate a new PR.",
    bgClass: "bg-slate-50",
    borderClass: "border-slate-200",
    iconClass: "text-slate-400",
  },
};

function StatusCard({ status }: { status: string }) {
  const config = STATUS_CARD_CONFIG[status];
  if (!config) return null;

  return (
    <div className={`rounded-lg border ${config.borderClass} ${config.bgClass} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${config.iconClass}`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 6v4m0 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-warm-900">{config.title}</h3>
          <p className="mt-1 text-sm text-warm-600">{config.description}</p>
        </div>
      </div>
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="inline-block">
      <path
        d="M12 8.667V12.667C12 13.0203 11.8595 13.3594 11.6095 13.6095C11.3594 13.8595 11.0203 14 10.667 14H3.333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.667V5.333C2 4.97971 2.14048 4.64057 2.39052 4.39052C2.64057 4.14048 2.97971 4 3.333 4H7.333"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 2H14V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.667 9.333L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const projectQuery = useProject(projectId);

  const [regenerateState, setRegenerateState] = useState<RegenerateState>({ status: "idle", message: "" });
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);

  const project = useMemo(() => {
    const data = projectQuery.data as null | { project?: unknown };
    return (data?.project as null | Record<string, unknown>) ?? null;
  }, [projectQuery.data]);

  const userPlan: UserPlan = useMemo(() => {
    const plan = (projectQuery.data as null | Record<string, unknown>)?.userPlan;
    return plan === "free" || plan === "pro" || plan === "team" ? plan : "pro";
  }, [projectQuery.data]);

  // Auto-dismiss success message after 5 seconds
  useEffect(() => {
    if (regenerateState.status === "success") {
      const timer = setTimeout(() => {
        setRegenerateState({ status: "idle", message: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [regenerateState.status]);

  // Rate limit countdown timer
  useEffect(() => {
    if (retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (retryCountdown === 0 && regenerateState.status === "error" && regenerateState.retryAfter) {
      setRegenerateState({ status: "idle", message: "" });
    }
  }, [retryCountdown, regenerateState.status, regenerateState.retryAfter]);

  // Clear optimistic status when real status updates to analyzing
  useEffect(() => {
    const realStatus = String(project?.status ?? "");
    if (realStatus === "analyzing" && optimisticStatus === "analyzing") {
      setOptimisticStatus(null);
    }
  }, [project?.status, optimisticStatus]);

  async function onRegenerate() {
    setRegenerateState({ status: "loading", message: "" });
    setOptimisticStatus("analyzing");

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/regenerate`, { method: "POST" });
      const body = (await response.json().catch(() => null)) as null | { success?: boolean; message?: string };

      if (!response.ok || !body?.success) {
        setOptimisticStatus(null);

        if (response.status === 429) {
          const retrySeconds = 300; // 5 minutes
          setRetryCountdown(retrySeconds);
          setRegenerateState({
            status: "error",
            message: `Rate limited. Try again in ${Math.ceil(retrySeconds / 60)} minutes.`,
            retryAfter: retrySeconds,
          });
        } else {
          setRegenerateState({ status: "error", message: body?.message ?? "Unable to regenerate." });
        }
        return;
      }

      setRegenerateState({
        status: "success",
        message: "Analysis started — this page will update automatically.",
      });
      await projectQuery.refetch();
    } catch {
      setOptimisticStatus(null);
      setRegenerateState({ status: "error", message: "Unable to regenerate." });
    }
  }

  if (projectQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <Skeleton className="h-4 w-20" />
          <div className="mt-3 flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="mt-3 h-2 w-full" />
        </div>
        <SkeletonList />
      </div>
    );
  }

  if (projectQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">Unable to load project. Please try again.</p>
      </div>
    );
  }

  const realStatus = String(project?.status ?? "");
  const displayStatus = optimisticStatus ?? realStatus;
  const prUrl = typeof project?.prUrl === "string" ? (project.prUrl as string) : null;
  const lastEventAt = typeof project?.lastEventAt === "string" ? (project.lastEventAt as string) : null;
  const quotaLimit = Number((projectQuery.data as Record<string, unknown>)?.quotaLimit ?? 0);
  const quotaUsed = Number((projectQuery.data as Record<string, unknown>)?.quotaUsed ?? 0);
  const isOverQuota = Boolean((projectQuery.data as Record<string, unknown>)?.isOverQuota);

  const showRerunButton = canRegenerate(realStatus) && !optimisticStatus;
  const isRateLimited = retryCountdown > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Status Badge with optimistic update */}
      {optimisticStatus && (
        <div className="flex items-center gap-2">
          <StatusBadge status={displayStatus} />
          <span className="text-sm text-warm-500">Updating...</span>
        </div>
      )}

      {/* Status-specific empty state card */}
      {!optimisticStatus && canRegenerate(realStatus) && <StatusCard status={realStatus} />}

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {prUrl && (
          <a
            href={prUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            View PR <ExternalLinkIcon />
          </a>
        )}

        {showRerunButton && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerateState.status === "loading" || isRateLimited}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {regenerateState.status === "loading" ? "Re-running…" : "Re-run Analysis"}
          </button>
        )}
      </div>

      {/* Feedback messages */}
      {regenerateState.message && (
        <div
          className={[
            "rounded-md border px-3 py-2 text-sm flex items-center justify-between",
            regenerateState.status === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          <span>{regenerateState.message}</span>
          {isRateLimited && (
            <span className="ml-2 font-mono text-xs">
              {Math.floor(retryCountdown / 60)}:{String(retryCountdown % 60).padStart(2, "0")}
            </span>
          )}
        </div>
      )}

      {/* QuotaDisplay only for relevant states */}
      {shouldShowQuota(displayStatus) && (
        <QuotaDisplay used={quotaUsed} limit={quotaLimit} isOverQuota={isOverQuota} userPlan={userPlan} />
      )}

      {/* OnboardingChecklist only when PR exists and not active */}
      {displayStatus !== "active" && prUrl && <OnboardingChecklist project={{ status: displayStatus, prUrl, lastEventAt }} />}
    </div>
  );
}
