import type { TinybirdClient } from '../tinybird/client';
import { createTinybirdClientFromEnv, tinybirdSql } from '../tinybird/client';

export type AnalyticsServiceError = {
  status: 'service_error';
  message: string;
  queryName?: string;
};

export class AnalyticsTinybirdQueryError extends Error {
  readonly status = 'service_error';
  readonly queryName: string;

  constructor(queryName: string) {
    super('Analytics service query failed.');
    this.name = 'AnalyticsTinybirdQueryError';
    this.queryName = queryName;
  }
}

export function createAnalyticsTinybirdClient(): TinybirdClient {
  return createTinybirdClientFromEnv();
}

export function escapeAnalyticsSqlString(value: string): string {
  return value.replaceAll("'", "''");
}

export async function runAnalyticsTinybirdQuery<T>(
  client: TinybirdClient,
  queryName: string,
  query: string
): Promise<{ data: T[] }> {
  try {
    return await tinybirdSql<T>(client, query);
  } catch {
    throw new AnalyticsTinybirdQueryError(queryName);
  }
}

export function toAnalyticsServiceError(error: unknown): AnalyticsServiceError {
  if (error instanceof AnalyticsTinybirdQueryError) {
    return {
      status: 'service_error',
      message: 'Analytics service could not complete the requested query.',
      queryName: error.queryName,
    };
  }

  return {
    status: 'service_error',
    message: 'Analytics service could not complete the request.',
  };
}
