import React from "react";

type OnboardingProject = {
  status: string;
  prUrl: string | null;
  lastEventAt: string | null;
};

type Step = { id: string; label: string; done: boolean };

function buildSteps(project: OnboardingProject): Step[] {
  const prCreated = project.prUrl !== null;
  const prMerged = project.status === "active";
  const deployedAndSendingEvents = project.lastEventAt !== null;

  return [
    { id: "pr", label: "Review the generated PR", done: prCreated },
    { id: "merge", label: "Merge the PR and deploy", done: prMerged },
    { id: "events", label: "Confirm events are coming in", done: deployedAndSendingEvents },
  ];
}

export default function OnboardingChecklist({ project }: { project: OnboardingProject }) {
  const steps = buildSteps(project);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Onboarding</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center justify-between gap-3 text-sm text-slate-800">
            <span>{step.label}</span>
            <span className="text-xs text-slate-600">{step.done ? "Done" : "Todo"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

