"use client";

import React, { useMemo, useState } from "react";

import OnboardingChecklist from "../../../../components/dashboard/onboarding-checklist";
import QuotaDisplay from "../../../../components/dashboard/quota-display";
import Skeleton, { SkeletonList } from "../../../../components/dashboard/skeleton";
import { useProject } from "../../../../lib/hooks/use-project";
import type { UserPlan } from "../../../../lib/stripe/plans";

type RegenerateState = { status: "idle" | "loading" | "success" | "error"; message: string };

function canRegenerate(status: string): boolean {
  return status === "analysis_failed" || status === "pr_closed";
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

  const project = useMemo(() => {
    const data = projectQuery.data as null | { project?: unknown };
    return (data?.project as null | Record<string, unknown>) ?? null;
  }, [projectQuery.data]);

  const userPlan: UserPlan = useMemo(() => {
    const plan = (projectQuery.data as null | Record<string, unknown>)?.userPlan;
    return plan === "free" || plan === "pro" || plan === "team" ? plan : "pro";
  }, [projectQuery.data]);

  async function onRegenerate() {
    setRegenerateState({ status: "loading", message: "" });
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/regenerate`, { method: "POST" });
      const body = (await response.json().catch(() => null)) as null | { success?: boolean; message?: string };
      if (!response.ok || !body?.success) {
        setRegenerateState({ status: "error", message: body?.message ?? "Unable to regenerate." });
        return;
      }

      setRegenerateState({ status: "success", message: body.message ?? "Regeneration started." });
      await projectQuery.refetch();
    } catch {
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

  const status = String(project?.status ?? "");
  const prUrl = typeof project?.prUrl === "string" ? (project.prUrl as string) : null;
  const lastEventAt = typeof project?.lastEventAt === "string" ? (project.lastEventAt as string) : null;
  const quotaLimit = Number((projectQuery.data as Record<string, unknown>)?.quotaLimit ?? 0);
  const quotaUsed = Number((projectQuery.data as Record<string, unknown>)?.quotaUsed ?? 0);
  const isOverQuota = Boolean((projectQuery.data as Record<string, unknown>)?.isOverQuota);

  return (
    <div className="flex flex-col gap-6">
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

        {canRegenerate(status) && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerateState.status === "loading"}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {regenerateState.status === "loading" ? "Regenerating…" : "Regenerate PR"}
          </button>
        )}
      </div>

      {regenerateState.message && (
        <div
          className={[
            "rounded-md border px-3 py-2 text-sm",
            regenerateState.status === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          {regenerateState.message}
        </div>
      )}

      <QuotaDisplay used={quotaUsed} limit={quotaLimit} isOverQuota={isOverQuota} userPlan={userPlan} />

      {status !== "active" && <OnboardingChecklist project={{ status, prUrl, lastEventAt }} />}
    </div>
  );
}
