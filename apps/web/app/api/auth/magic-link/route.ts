import { z } from "zod";

import { countRecentMagicLinks, createMagicLink } from "../../../../lib/auth/magic-link";
import { sendMagicLinkEmail } from "../../../../lib/email/send";

const bodySchema = z.object({
  email: z.string().email(),
});

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;

export async function POST(request: Request): Promise<Response> {
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

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentCount = await countRecentMagicLinks(normalizedEmail, windowStart);

  const successResponse = { success: true, message: "Check your email for a login link" };
  if (recentCount >= RATE_LIMIT_MAX_REQUESTS) {
    return Response.json(successResponse);
  }

  const loginUrl = await createMagicLink(normalizedEmail);
  await sendMagicLinkEmail({ to: normalizedEmail, loginUrl });

  return Response.json(successResponse);
}

