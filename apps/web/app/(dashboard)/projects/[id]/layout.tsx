"use client";

import React from "react";
import { usePathname } from "next/navigation";

import { useProject } from "../../../../lib/hooks/use-project";
import StatusBadge from "../../../../components/dashboard/status-badge";
import Skeleton from "../../../../components/dashboard/skeleton";

type Tab = { label: string; href: string };

function getTabs(projectId: string): Tab[] {
  return [
    { label: "Overview", href: `/projects/${projectId}` },
    { label: "Analytics", href: `/projects/${projectId}/overview` },
    { label: "Live Feed", href: `/projects/${projectId}/live` },
    { label: "Sessions", href: `/projects/${projectId}/sessions` },
  ];
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-slate-400">
      <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProjectLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const projectId = params.id;
  const pathname = usePathname();
  const projectQuery = useProject(projectId);

  const tabs = getTabs(projectId);

  const project = React.useMemo(() => {
    const data = projectQuery.data as null | { project?: unknown };
    return (data?.project as null | Record<string, unknown>) ?? null;
  }, [projectQuery.data]);

  const repoName = project?.githubRepoFullName ? String(project.githubRepoFullName) : null;
  const status = project?.status ? String(project.status) : null;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm">
        <a href="/projects" className="text-slate-600 transition-colors hover:text-slate-900">
          Projects
        </a>
        <ChevronRightIcon />
        {projectQuery.isPending ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <span className="font-medium text-slate-900">{repoName ?? projectId}</span>
        )}
      </nav>

      {/* Project Header */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            {projectQuery.isPending ? (
              <>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="mt-1 h-4 w-24" />
              </>
            ) : (
              <>
                <h1 className="break-words font-display text-2xl font-semibold tracking-tight text-slate-900">
                  {repoName ?? projectId}
                </h1>
                {status && <StatusBadge status={status} />}
              </>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <a
                key={tab.href}
                href={tab.href}
                className={[
                  "relative whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")}
              >
                {tab.label}
              </a>
            );
          })}
        </nav>
      </header>

      {/* Page Content */}
      {children}
    </div>
  );
}
