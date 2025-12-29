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
      className="group relative flex flex-col gap-3 overflow-hidden rounded-lg border border-warm-200 bg-white p-4 shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:border-warm-300 hover:shadow-warm-md"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-500 to-brand-400 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-warm-900 transition-colors group-hover:text-brand-600">
            {project.githubRepoFullName}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-warm-500">
            <svg className="size-3" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {lastEventLabel}
          </p>
        </div>

        <StatusBadge status={project.status} />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

