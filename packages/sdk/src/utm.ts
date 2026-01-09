const MAX_VALUE_LENGTH = 100;

const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type UTMParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};

export function captureUTMParams(): UTMParams {
  // SSR guard
  if (typeof window === "undefined") {
    return {};
  }

  const searchParams = new URLSearchParams(window.location.search);
  const result: UTMParams = {};

  for (const param of UTM_PARAMS) {
    const value = searchParams.get(param);
    if (value) {
      // Truncate to max length
      result[param] = value.slice(0, MAX_VALUE_LENGTH);
    }
  }

  return result;
}
