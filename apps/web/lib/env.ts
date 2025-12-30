import { readRequiredEnv } from "./env/read-required-env";

export type ServerEnv = {
  DATABASE_URL: string;
};

export function getServerEnv(): ServerEnv {
  return {
    DATABASE_URL: readRequiredEnv("DATABASE_URL"),
  };
}

export const env = getServerEnv();
