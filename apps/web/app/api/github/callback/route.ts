import { NextResponse } from "next/server";

import { getUserFromRequest } from "../../../../lib/auth/get-user";
import { getOrRefreshInstallationToken, upsertInstallationLink } from "../../../../lib/db/queries/github-tokens";

function redirect(request: Request, path: string): Response {
  return NextResponse.redirect(new URL(path, request.url));
}

function parseInstallationId(request: Request): bigint | null {
  const url = new URL(request.url);
  const installationIdRaw = url.searchParams.get("installation_id");
  if (!installationIdRaw || !/^[0-9]+$/.test(installationIdRaw)) return null;
  return BigInt(installationIdRaw);
}

export async function GET(request: Request): Promise<Response> {
  const user = await getUserFromRequest(request);
  if (!user) return redirect(request, "/login");

  const installationId = parseInstallationId(request);
  if (installationId === null) return redirect(request, "/dashboard");

  await upsertInstallationLink({ userId: user.id, installationId });
  try {
    await getOrRefreshInstallationToken({ userId: user.id, installationId });
  } catch (error) {
    console.error("GitHub installation callback: failed to fetch installation token", error);
  }
  return redirect(request, "/dashboard");
}
