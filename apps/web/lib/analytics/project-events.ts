import { createTinybirdClientFromEnv, tinybirdSql } from "../tinybird/client";

export function normalizeAnalyticsTimestamp(value: unknown): string | null {
  const raw = String(value ?? "");
  if (!raw) return null;
  if (raw.includes("T")) return raw.endsWith("Z") ? raw : `${raw}Z`;

  const iso = raw.replace(" ", "T");
  return iso.endsWith("Z") ? iso : `${iso}Z`;
}

function escapeSqlString(value: string): string {
  return value.replaceAll("'", "''");
}

export async function fetchLastEventAtByProjectId(projectIds: string[]): Promise<Map<string, string>> {
  if (projectIds.length === 0) return new Map();

  const inList = projectIds.map((id) => `'${escapeSqlString(id)}'`).join(", ");
  const client = createTinybirdClientFromEnv();

  const result = await tinybirdSql<{ project_id: string; last_event_at: string }>(
    client,
    `
      SELECT
        project_id,
        toString(max(timestamp)) AS last_event_at
      FROM events
      WHERE project_id IN (${inList})
      GROUP BY project_id
    `.trim(),
  );

  const map = new Map<string, string>();
  for (const row of result.data) {
    const projectId = String((row as { project_id?: unknown }).project_id ?? "");
    if (!projectId) continue;
    const normalized = normalizeAnalyticsTimestamp((row as { last_event_at?: unknown }).last_event_at);
    if (!normalized) continue;
    map.set(projectId, normalized);
  }

  return map;
}

export async function fetchLastEventAtForProject(projectId: string): Promise<string | null> {
  const values = await fetchLastEventAtByProjectId([projectId]);
  return values.get(projectId) ?? null;
}

export function resolveLastEventAt(
  tinybirdLastEventAt: string | null | undefined,
  storedLastEventAt: Date | null | undefined,
): string | null {
  return tinybirdLastEventAt ?? (storedLastEventAt ? storedLastEventAt.toISOString() : null);
}
