import fs from "node:fs/promises";
import path from "node:path";

const SCENARIO_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

type FixtureSinkConfig =
  | { enabled: false }
  | { enabled: true; filePath: string };

function resolveFixtureSinkConfig(): FixtureSinkConfig {
  if (process.env.NODE_ENV === "production") return { enabled: false };
  if (process.env.E2E_TEST_MODE !== "1") return { enabled: false };

  const scenarioId = process.env.E2E_EVENTS_FIXTURE_SCENARIO;
  if (!scenarioId) return { enabled: false };
  if (!SCENARIO_ID_PATTERN.test(scenarioId)) {
    throw new Error("Invalid E2E_EVENTS_FIXTURE_SCENARIO");
  }

  const fixtureRoot = process.env.E2E_ANALYTICS_FIXTURE_DIR;
  if (!fixtureRoot) {
    throw new Error("E2E_ANALYTICS_FIXTURE_DIR is required when the event fixture sink is enabled");
  }

  return {
    enabled: true,
    filePath: path.join(fixtureRoot, scenarioId, "events.jsonl"),
  };
}

export async function appendE2EFixtureEvents(
  events: unknown[],
): Promise<{ enabled: false } | { enabled: true; stored: number }> {
  const config = resolveFixtureSinkConfig();
  if (!config.enabled) return { enabled: false };

  await fs.mkdir(path.dirname(config.filePath), { recursive: true });

  if (events.length > 0) {
    const lines = `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
    await fs.appendFile(config.filePath, lines, "utf8");
  }

  return { enabled: true, stored: events.length };
}

export async function clearE2EFixtureEvents(): Promise<{ enabled: boolean }> {
  const config = resolveFixtureSinkConfig();
  if (!config.enabled) return { enabled: false };

  await fs.mkdir(path.dirname(config.filePath), { recursive: true });
  await fs.writeFile(config.filePath, "", "utf8");

  return { enabled: true };
}
