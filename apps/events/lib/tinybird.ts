type RetryConfig = {
  maxAttempts: number;
  baseDelayMs: number;
};

export type TinybirdClientConfig = {
  apiUrl: string;
  token: string;
  datasource: string;
  fetch?: typeof fetch;
  retry?: RetryConfig;
  wait?: boolean;
};

export type TinybirdClient = {
  appendEvents: (events: unknown[]) => Promise<void>;
};

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (typeof value === "string" && value.length > 0) return value;
  throw new Error(`Missing required environment variable: ${name}`);
}

function buildEventsUrl(apiUrl: string, datasource: string, wait: boolean): string {
  const url = new URL("/v0/events", apiUrl);
  url.searchParams.set("name", datasource);
  url.searchParams.set("wait", wait ? "true" : "false");
  return url.toString();
}

function toNdjson(events: unknown[]): string {
  return `${events.map((e) => JSON.stringify(e)).join("\n")}\n`;
}

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function createTinybirdClientFromEnv(): TinybirdClient {
  return createTinybirdClient({
    apiUrl: readRequiredEnv("TINYBIRD_API_URL"),
    token: readRequiredEnv("TINYBIRD_EVENTS_TOKEN"),
    datasource: "events",
  });
}

export function createTinybirdClient(config: TinybirdClientConfig): TinybirdClient {
  const fetchImpl = config.fetch ?? fetch;
  const retry: RetryConfig = config.retry ?? { maxAttempts: 3, baseDelayMs: 200 };
  const wait = config.wait ?? true;

  if (!config.apiUrl) throw new Error("Missing Tinybird apiUrl");
  if (!config.token) throw new Error("Missing Tinybird token");
  if (!config.datasource) throw new Error("Missing Tinybird datasource");

  const url = buildEventsUrl(config.apiUrl, config.datasource, wait);

  return {
    async appendEvents(events: unknown[]) {
      if (!Array.isArray(events) || events.length === 0) return;

      const body = toNdjson(events);
      let lastError: unknown;

      for (let attempt = 0; attempt < retry.maxAttempts; attempt++) {
        try {
          const response = await fetchImpl(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.token}`,
              "Content-Type": "application/x-ndjson",
            },
            body,
          });

          if (response.ok) return;

          const responseText = await response.text().catch(() => "");
          const error = new Error(
            `Tinybird ingestion failed (status=${response.status}): ${responseText || response.statusText}`,
          );

          if (!isRetriableStatus(response.status) || attempt === retry.maxAttempts - 1) {
            throw error;
          }

          lastError = error;
        } catch (error) {
          if (attempt === retry.maxAttempts - 1) throw error;
          lastError = error;
        }

        const delay = retry.baseDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }

      throw lastError instanceof Error ? lastError : new Error("Tinybird ingestion failed");
    },
  };
}

