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
      <header className="flex flex-col gap-2 opacity-0 animate-fade-in">
        <h1 className="font-display text-3xl tracking-tight text-warm-900">Projects</h1>
        <p className="text-sm text-warm-500">Your connected repositories.</p>
      </header>

      {projectsQuery.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : projectsQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 animate-fade-in">
          <p className="text-sm text-red-700">Unable to load projects. Please try again.</p>
        </div>
      ) : projectsQuery.data.projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-warm-300 bg-gradient-to-b from-warm-50 to-warm-100/50 px-8 py-16 text-center opacity-0 animate-fade-in-up">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <path
                d="M44 38C44 39.0609 43.5786 40.0783 42.8284 40.8284C42.0783 41.5786 41.0609 42 40 42H8C6.93913 42 5.92172 41.5786 5.17157 40.8284C4.42143 40.0783 4 39.0609 4 38V10C4 8.93913 4.42143 7.92172 5.17157 7.17157C5.92172 6.42143 6.93913 6 8 6H18L22 12H40C41.0609 12 42.0783 12.4214 42.8284 13.1716C43.5786 13.9217 44 14.9391 44 16V38Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M24 22V34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18 28H30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="mt-6 font-display text-xl text-warm-900">No projects yet</h3>
          <p className="mt-2 max-w-sm text-sm text-warm-500">
            Connect your first Next.js repository and we'll automatically set up analytics for you.
          </p>
          <a
            href="https://github.com/apps/tally-analytics-agent"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-warm transition-all hover:bg-brand-600 hover:shadow-warm-md"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Install GitHub App
          </a>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projectsQuery.data.projects.map((project, index) => (
            <div key={project.id} className={`opacity-0 animate-fade-in stagger-${Math.min(index + 1, 6)}`}>
              <ProjectCard project={project} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

