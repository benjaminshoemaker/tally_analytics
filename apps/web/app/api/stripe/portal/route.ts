import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { validateSession } from "../../../../lib/auth/session";
import { getAppUrl } from "../../../../lib/app-url";
import { db } from "../../../../lib/db/client";
import { users } from "../../../../lib/db/schema";
import { getStripe } from "../../../../lib/stripe/client";

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export async function POST(request: Request): Promise<Response> {
  const session = await validateSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.select({ stripeCustomerId: users.stripeCustomerId }).from(users).where(eq(users.id, session.userId));
  const user = rows[0];
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.stripeCustomerId) {
    return Response.json({ error: "No Stripe customer" }, { status: 400 });
  }

  const stripe = getStripe();
  const appUrl = normalizeBaseUrl(getAppUrl());

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/settings`,
      configuration: process.env.STRIPE_BILLING_PORTAL_CONFIG_ID || undefined,
    });

    if (!portalSession.url) {
      console.error("stripe.portal.session_missing_url", { stripeCustomerId: user.stripeCustomerId, sessionId: portalSession.id });
      return Response.json({ error: "Failed to create billing portal session" }, { status: 500 });
    }

    return NextResponse.redirect(portalSession.url, { status: 303 });
  } catch (error) {
    console.error("stripe.portal.session_create_failed", { stripeCustomerId: user.stripeCustomerId, error });
    return Response.json({ error: "Failed to create billing portal session" }, { status: 500 });
  }
}

