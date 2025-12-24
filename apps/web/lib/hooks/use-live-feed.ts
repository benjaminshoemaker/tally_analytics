"use client";

import { useQuery } from "@tanstack/react-query";

export const LIVE_FEED_REFETCH_INTERVAL_MS = 5000;

export type LiveFeedEvent = {
  id: string;
  eventType: string;
  path: string;
  referrer: string | null;
  timestamp: string;
  relativeTime: string;
};

export type LiveFeedResponse = { events: LiveFeedEvent[]; hasMore: boolean };

type ErrorResponse = { error?: string; message?: string };

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const maybe = body as ErrorResponse;
  if (typeof maybe.error === "string" && maybe.error.length > 0) return maybe.error;
  if (typeof maybe.message === "string" && maybe.message.length > 0) return maybe.message;
  return null;
}

export async function fetchLiveFeed(projectId: string): Promise<LiveFeedResponse> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/analytics/live`, {
    method: "GET",
    headers: { accept: "application/json" },
  });

  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) throw new Error(extractErrorMessage(body) ?? `Request failed (${response.status})`);
  return body as LiveFeedResponse;
}

export function useLiveFeed(projectId: string) {
  return useQuery({
    queryKey: ["live-feed", projectId],
    queryFn: () => fetchLiveFeed(projectId),
    enabled: projectId.length > 0,
    refetchInterval: LIVE_FEED_REFETCH_INTERVAL_MS,
  });
}

