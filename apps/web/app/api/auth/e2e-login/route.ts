import { z } from "zod";

import { NextResponse } from "next/server";

import { buildSessionCookie } from "../../../../lib/auth/cookies";
import { createSession } from "../../../../lib/auth/session";

const bodySchema = z.object({
  userId: z.string().uuid(),
});

export async function POST(request: Request): Promise<Response> {
  if (process.env.E2E_TEST_MODE !== "1") {
    return new Response(null, { status: 404 });
  }

  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ success: false, message: "Invalid request" }, { status: 400 });
  }

  const session = await createSession(parsed.data.userId);

  const response = NextResponse.json({ success: true });
  response.cookies.set(buildSessionCookie(session.id));
  return response;
}

