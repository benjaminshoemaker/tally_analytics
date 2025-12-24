"use client";

import React from "react";

import ProjectCard from "../../../components/dashboard/project-card";
import { useProjects } from "../../../lib/hooks/use-projects";

export default function ProjectsPage() {
  const projectsQuery = useProjects();

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Projects</h1>
        <p className="text-sm text-slate-600">Your connected repositories.</p>
      </header>

      {projectsQuery.isPending ? (
        <p className="text-sm text-slate-700">Loading projects…</p>
      ) : projectsQuery.isError ? (
        <p className="text-sm text-slate-700">Unable to load projects.</p>
      ) : projectsQuery.data.projects.length === 0 ? (
        <p className="text-sm text-slate-700">No projects yet. Install the GitHub App to get started.</p>
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

