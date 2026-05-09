import type { TallyMcpAuthInfo } from "../auth";

export function userIdFromAuth(authInfo: unknown): string | null {
  const auth = authInfo as Partial<TallyMcpAuthInfo> | undefined;
  const userId = auth?.extra?.userId;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}
