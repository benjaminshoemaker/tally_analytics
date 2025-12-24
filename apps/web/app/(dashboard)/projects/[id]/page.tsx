"use client";

import React, { useMemo, useState } from "react";

import OnboardingChecklist from "../../../../components/dashboard/onboarding-checklist";
import { useProject } from "../../../../lib/hooks/use-project";

type RegenerateState = { status: "idle" | "loading" | "success" | "error"; message: string };

function canRegenerate(status: string): boolean {
  return status === "analysis_failed" || status === "pr_closed";
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const projectQuery = useProject(projectId);

  const [regenerateState, setRegenerateState] = useState<RegenerateState>({ status: "idle", message: "" });

  const project = useMemo(() => {
    const data = projectQuery.data as null | { project?: unknown };
    return (data?.project as null | Record<string, unknown>) ?? null;
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
    return <p className="text-sm text-slate-700">Loading project…</p>;
  }

  if (projectQuery.isError) {
    return <p className="text-sm text-slate-700">Unable to load project.</p>;
  }

  const status = String(project?.status ?? "");
  const repoName = String(project?.githubRepoFullName ?? projectId);
  const prUrl = typeof project?.prUrl === "string" ? (project.prUrl as string) : null;
  const lastEventAt = typeof project?.lastEventAt === "string" ? (project.lastEventAt as string) : null;

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{repoName}</h1>
        <p className="text-sm text-slate-600">Status: {status || "unknown"}</p>

        {prUrl ? (
          <a href={prUrl} className="text-sm font-medium text-slate-900 underline" target="_blank" rel="noreferrer">
            View PR
          </a>
        ) : (
          <p className="text-sm text-slate-600">No PR link yet.</p>
        )}

        {canRegenerate(status) ? (
          <div className="mt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={onRegenerate}
              disabled={regenerateState.status === "loading"}
              className="w-fit rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {regenerateState.status === "loading" ? "Regenerating…" : "Regenerate PR"}
            </button>
            {regenerateState.message ? <p className="text-sm text-slate-700">{regenerateState.message}</p> : null}
          </div>
        ) : null}
      </header>

      <nav className="flex flex-wrap gap-3 text-sm">
        <a className="text-slate-900 underline" href={`/projects/${projectId}/overview`}>
          Overview
        </a>
        <a className="text-slate-900 underline" href={`/projects/${projectId}/live`}>
          Live feed
        </a>
        <a className="text-slate-900 underline" href={`/projects/${projectId}/sessions`}>
          Sessions
        </a>
      </nav>

      {status !== "active" ? <OnboardingChecklist project={{ status, prUrl, lastEventAt }} /> : null}
    </div>
  );
}

