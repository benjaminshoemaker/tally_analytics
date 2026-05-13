export const ANALYTICS_TASK_EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{0,99}$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeTaskText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const compact = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!compact) return null;
  return compact.slice(0, maxLength);
}

export function normalizeTaskEventName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!ANALYTICS_TASK_EVENT_NAME_PATTERN.test(normalized)) return null;
  return normalized;
}

export function normalizeJsonObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
