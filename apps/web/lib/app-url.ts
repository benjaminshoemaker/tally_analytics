import { readRequiredEnv } from "./env/read-required-env";

export function getAppUrl(): string {
  return readRequiredEnv("NEXT_PUBLIC_APP_URL");
}

