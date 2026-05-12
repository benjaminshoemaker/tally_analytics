import crypto from "node:crypto";

function createPrefixedId(prefix: string, maxLength = 24): string {
  const entropy = crypto.randomBytes(12).toString("base64url");
  return `${prefix}${entropy}`.slice(0, maxLength);
}

export function createAnalyticsTaskId(): string {
  return createPrefixedId("task_");
}

export function createAnalyticsTaskStatusEventId(): string {
  return createPrefixedId("tse_");
}
