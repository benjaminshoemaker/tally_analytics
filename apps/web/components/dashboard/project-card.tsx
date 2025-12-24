import React from "react";

import type { ProjectsListItem } from "../../lib/hooks/use-projects";

export default function ProjectCard({ project }: { project: ProjectsListItem }) {
  const lastEventLabel = project.lastEventAt ? new Date(project.lastEventAt).toLocaleString() : "No events yet";

  return (
    <a
      href={`/projects/${project.id}`}
      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-900">{project.githubRepoFullName}</h2>
          <p className="text-xs text-slate-600">{lastEventLabel}</p>
        </div>

        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{project.status}</span>
      </div>
    </a>
  );
}

