import React from "react";

import type { ProjectsListItem } from "../../lib/hooks/use-projects";
import StatusBadge from "./status-badge";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function ProjectCard({ project }: { project: ProjectsListItem }) {
  const lastEventLabel = project.lastEventAt ? formatRelativeTime(project.lastEventAt) : "No events yet";

  return (
    <a
      href={`/projects/${project.id}`}
      className="group flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-slate-900 group-hover:text-slate-700">
            {project.githubRepoFullName}
          </h2>
          <p className="mt-1 text-xs text-slate-500">Last event: {lastEventLabel}</p>
        </div>

        <StatusBadge status={project.status} />
      </div>
    </a>
  );
}

