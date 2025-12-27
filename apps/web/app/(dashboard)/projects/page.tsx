"use client";

import React from "react";

import ProjectCard from "../../../components/dashboard/project-card";
import { SkeletonCard } from "../../../components/dashboard/skeleton";
import { useProjects } from "../../../lib/hooks/use-projects";

function FolderPlusIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-slate-300">
      <path
        d="M44 38C44 39.0609 43.5786 40.0783 42.8284 40.8284C42.0783 41.5786 41.0609 42 40 42H8C6.93913 42 5.92172 41.5786 5.17157 40.8284C4.42143 40.0783 4 39.0609 4 38V10C4 8.93913 4.42143 7.92172 5.17157 7.17157C5.92172 6.42143 6.93913 6 8 6H18L22 12H40C41.0609 12 42.0783 12.4214 42.8284 13.1716C43.5786 13.9217 44 14.9391 44 16V38Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 22V34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 28H30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProjectsPage() {
  const projectsQuery = useProjects();

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Projects</h1>
        <p className="text-sm text-slate-600">Your connected repositories.</p>
      </header>

      {projectsQuery.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : projectsQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">Unable to load projects. Please try again.</p>
        </div>
      ) : projectsQuery.data.projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <FolderPlusIcon />
          <h3 className="mt-4 text-sm font-semibold text-slate-900">No projects yet</h3>
          <p className="mt-1 text-sm text-slate-600">Install the GitHub App to connect your first repository.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projectsQuery.data.projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

