export type TinybirdClient = {
  apiUrl: string;
  token: string;
};

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (typeof value === "string" && value.length > 0) return value;
  throw new Error(`Missing required environment variable: ${name}`);
}

export function createTinybirdClientFromEnv(): TinybirdClient {
  const apiUrl = readRequiredEnv("TINYBIRD_API_URL").replace(/\/+$/, "");
  const token = readRequiredEnv("TINYBIRD_ADMIN_TOKEN");
  return { apiUrl, token };
}

export async function tinybirdPipe<T>(
  client: TinybirdClient,
  pipeName: string,
  params: Record<string, string | number>,
): Promise<{ data: T[] }> {
  const url = new URL(`${client.apiUrl}/v0/pipes/${pipeName}.json`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${client.token}` } });
  const json = (await response.json().catch(() => null)) as null | { data?: T[] };
  if (!response.ok || !json || !Array.isArray(json.data)) throw new Error("Tinybird pipe request failed");

  return { data: json.data };
}

export async function tinybirdSql<T>(client: TinybirdClient, query: string): Promise<{ data: T[] }> {
  const url = new URL(`${client.apiUrl}/v0/sql`);
  const normalizedQuery = query.trim().replace(/;\s*$/, "");
  const formattedQuery = /\bFORMAT\b/i.test(normalizedQuery)
    ? normalizedQuery
    : `${normalizedQuery}\nFORMAT JSON`;

  const body = new URLSearchParams({ q: formattedQuery });

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${client.token}`, "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await response.json().catch(() => null)) as null | { data?: T[] };
  if (!response.ok || !json || !Array.isArray(json.data)) throw new Error("Tinybird SQL request failed");

  return { data: json.data };
}
