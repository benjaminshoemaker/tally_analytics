export const DEFAULT_ANALYTICS_STRING_LIMIT = 256;

export type AnalyticsDashboardUrls = {
  project: string;
  overview: string;
  live: string;
  sessions: string;
};

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function configuredBaseUrl(): string {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL ?? 'https://usetally.xyz');
}

function stripQueryAndFragment(value: string): string {
  return value.split('#')[0].split('?')[0];
}

function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, '');
}

export function boundAnalyticsString(
  value: unknown,
  limit: number = DEFAULT_ANALYTICS_STRING_LIMIT
): string {
  const normalized = stripControlCharacters(String(value ?? '')).trim();
  if (normalized.length <= limit) return normalized;
  return Array.from(normalized).slice(0, limit).join('');
}

export function sanitizeAnalyticsUrl(value: unknown): string {
  const bounded = boundAnalyticsString(value);
  if (!bounded) return '';

  try {
    const url = new URL(bounded);
    url.search = '';
    url.hash = '';
    return boundAnalyticsString(url.toString().replace(/\/$/, url.pathname === '/' ? '/' : ''));
  } catch {
    return boundAnalyticsString(stripQueryAndFragment(bounded));
  }
}

export function sanitizeAnalyticsPath(value: unknown): string {
  const bounded = boundAnalyticsString(value);
  if (!bounded) return '';

  try {
    const url = new URL(bounded);
    return boundAnalyticsString(url.pathname || '/');
  } catch {
    return boundAnalyticsString(stripQueryAndFragment(bounded));
  }
}

export function sanitizeAnalyticsReferrer(value: unknown): string {
  const bounded = boundAnalyticsString(value);
  if (!bounded) return 'Direct';

  const candidates = [bounded];
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(bounded) && bounded.includes('.')) {
    candidates.push(`https://${bounded}`);
  }

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (url.hostname) return boundAnalyticsString(url.hostname);
    } catch {
      // Fall back to a stripped display value below.
    }
  }

  const stripped = boundAnalyticsString(stripQueryAndFragment(bounded));
  return stripped || 'Direct';
}

export function buildAnalyticsDashboardUrls(
  projectId: string,
  baseUrl: string = configuredBaseUrl()
): AnalyticsDashboardUrls {
  const encodedProjectId = encodeURIComponent(projectId);
  const root = `${normalizeBaseUrl(baseUrl)}/projects/${encodedProjectId}`;

  return {
    project: root,
    overview: `${root}/overview`,
    live: `${root}/live`,
    sessions: `${root}/sessions`,
  };
}
