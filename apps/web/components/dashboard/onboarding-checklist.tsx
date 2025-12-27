import React from "react";

type OnboardingProject = {
  status: string;
  prUrl: string | null;
  lastEventAt: string | null;
};

type Step = { id: string; label: string; description: string; done: boolean };

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M13.333 4L5.999 11.333 2.666 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CircleIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function buildSteps(project: OnboardingProject): Step[] {
  const prCreated = project.prUrl !== null;
  const prMerged = project.status === "active";
  const deployedAndSendingEvents = project.lastEventAt !== null;

  return [
    {
      id: "pr",
      label: "Review the generated PR",
      description: "Check the analytics integration code",
      done: prCreated,
    },
    {
      id: "merge",
      label: "Merge the PR and deploy",
      description: "Deploy to start collecting events",
      done: prMerged,
    },
    {
      id: "events",
      label: "Confirm events are coming in",
      description: "Visit your site to trigger events",
      done: deployedAndSendingEvents,
    },
  ];
}

export default function OnboardingChecklist({ project }: { project: OnboardingProject }) {
  const steps = buildSteps(project);
  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Getting Started</h2>
        <span className="text-xs font-medium text-slate-600">
          {completedCount}/{steps.length} complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {steps.map((step, index) => {
          const isNextStep = !step.done && steps.slice(0, index).every((s) => s.done);

          return (
            <li key={step.id} className="flex items-start gap-3">
              {/* Checkbox */}
              <div
                className={[
                  "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full",
                  step.done
                    ? "bg-emerald-500 text-white"
                    : isNextStep
                      ? "border-2 border-slate-300 text-slate-300"
                      : "border border-slate-200 text-slate-200",
                ].join(" ")}
              >
                {step.done ? <CheckIcon className="h-3 w-3" /> : <span className="h-2 w-2" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={[
                    "text-sm font-medium",
                    step.done ? "text-slate-500 line-through" : "text-slate-900",
                  ].join(" ")}
                >
                  {step.label}
                </p>
                <p className="text-xs text-slate-500">{step.description}</p>
              </div>

              {/* Status */}
              {step.done && (
                <span className="flex-shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Done
                </span>
              )}
              {isNextStep && (
                <span className="flex-shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Next
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

