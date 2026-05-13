import fs from "node:fs";
import path from "node:path";

import { notFound } from "next/navigation";

import ScenarioLauncher, { type ManualScenario } from "../../components/e2e/scenario-launcher";

type ScenarioFile = {
  id: string;
  description: string;
  tags?: string[];
  user: {
    id: string;
    email: string;
  };
  projects?: Array<{
    displayName?: string;
    repoFullName?: string | null;
    id: string;
  }>;
  expectations?: {
    startPath?: string;
    assertions?: string[];
  };
};

const SCENARIO_GROUPS = [
  {
    title: "Dashboard states",
    description: "Project states you can inspect directly from the normal dashboard screens.",
    ids: [
      "active-project-with-campaign-data",
      "active-project-no-events",
      "analysis-failed-can-regenerate",
      "quota-exceeded",
      "unsupported-framework",
    ],
  },
  {
    title: "MCP analytics",
    description: "MCP-created projects with deterministic analytics events and signup-path data.",
    ids: [
      "mcp-active-with-signup-events",
      "mcp-active-partial-signup-data",
      "mcp-active-no-events",
    ],
  },
  {
    title: "Ask Tally tasks",
    description: "Dashboard question flows that answer directly or create task drafts.",
    ids: [
      "dashboard-task-question-answered",
      "dashboard-task-question-partial",
      "dashboard-task-question-cannot-answer",
      "dashboard-task-production-verified",
      "mcp-pending-analytics-task",
    ],
  },
];

function scenarioPath(id: string): string {
  return path.join(process.cwd(), "e2e", "scenarios", `${id}.json`);
}

function readScenario(id: string): ManualScenario {
  const raw = fs.readFileSync(scenarioPath(id), "utf8");
  const scenario = JSON.parse(raw) as ScenarioFile;
  const project = scenario.projects?.[0];

  return {
    id: scenario.id,
    description: scenario.description,
    tags: scenario.tags ?? [],
    user: scenario.user,
    route: scenario.expectations?.startPath ?? "/projects",
    assertions: scenario.expectations?.assertions ?? [],
    projectName: project?.displayName ?? project?.repoFullName ?? project?.id ?? scenario.id,
  };
}

export default function E2EPage() {
  if (process.env.E2E_TEST_MODE !== "1" || process.env.NODE_ENV === "production") {
    notFound();
  }

  const groups = SCENARIO_GROUPS.map((group) => ({
    title: group.title,
    description: group.description,
    scenarios: group.ids.map(readScenario),
  }));

  return <ScenarioLauncher groups={groups} />;
}
