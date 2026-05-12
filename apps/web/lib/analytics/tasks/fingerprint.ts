import crypto from "node:crypto";

import type { AnalyticsTaskDuplicateFingerprintInput } from "./types";

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableNormalize(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, stableNormalize(nested)]),
    );
  }
  if (typeof value === "string") return normalizeText(value);
  return value;
}

export function buildAnalyticsTaskDuplicateFingerprint(input: AnalyticsTaskDuplicateFingerprintInput): string {
  const canonical = {
    originalQuestion: normalizeText(input.originalQuestion),
    taskType: input.taskType,
    eventName: normalizeText(input.eventName),
    triggerDescription: normalizeText(input.triggerDescription),
    targetSurface: normalizeText(input.targetSurface),
    propertiesSchema: stableNormalize(input.propertiesSchema ?? {}),
  };

  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
