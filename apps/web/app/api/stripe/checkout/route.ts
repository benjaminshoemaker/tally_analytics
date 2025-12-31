import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { validateSession } from "../../../../lib/auth/session";
import { getAppUrl } from "../../../../lib/app-url";
import { db } from "../../../../lib/db/client";
import { users } from "../../../../lib/db/schema";
import { getPriceIdForPlan } from "../../../../lib/stripe/constants";
import { getStripe } from "../../../../lib/stripe/client";
import { isPaidPlan, type PaidPlan } from "../../../../lib/stripe/plans";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

async function createBillingPortalUrl(stripeCustomerId: string): Promise<string | null> {
  const stripe = getStripe();
  const appUrl = normalizeBaseUrl(getAppUrl());

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${appUrl}/settings`,
    configuration: process.env.STRIPE_BILLING_PORTAL_CONFIG_ID || undefined,
  });

  return typeof portalSession.url === "string" && portalSession.url.length > 0 ? portalSession.url : null;
}

export async function POST(request: Request): Promise<Response> {
  const session = await validateSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const planRaw = formData.get("plan");
  if (!isPaidPlan(planRaw)) {
    return Response.json({ error: "Invalid plan" }, { status: 400 });
  }
  const plan: PaidPlan = planRaw;

  const rows = await db
    .select({ id: users.id, email: users.email, plan: users.plan, stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, session.userId));

  const user = rows[0];
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const stripe = getStripe();

  let stripeCustomerId = user.stripeCustomerId ?? null;
  if (!stripeCustomerId) {
    try {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
      stripeCustomerId = customer.id;

      await db.update(users).set({ stripeCustomerId }).where(eq(users.id, user.id));
    } catch (error) {
      console.error("stripe.checkout.customer_create_failed", { userId: user.id, error });
      return Response.json({ error: "Failed to start checkout" }, { status: 500 });
    }
  }

  try {
    const subscriptions = await stripe.subscriptions.list({ customer: stripeCustomerId, status: "all", limit: 10 });
    const hasActiveSubscription = subscriptions.data.some((subscription) =>
      ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status),
    );

    if (hasActiveSubscription) {
      const manageUrl = await createBillingPortalUrl(stripeCustomerId);
      return Response.json({ error: "Subscription already exists", manageUrl }, { status: 409 });
    }
  } catch (error) {
    console.error("stripe.checkout.subscription_check_failed", { userId: user.id, stripeCustomerId, error });
    return Response.json({ error: "Failed to start checkout" }, { status: 500 });
  }

  const appUrl = normalizeBaseUrl(getAppUrl());

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: getPriceIdForPlan(plan), quantity: 1 }],
      subscription_data: {
        metadata: {
          userId: user.id,
          plan,
        },
      },
      success_url: `${appUrl}/settings?success=true&checkout_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/settings`,
    });

    if (!checkoutSession.url) {
      console.error("stripe.checkout.session_missing_url", { userId: user.id, stripeCustomerId, sessionId: checkoutSession.id });
      return Response.json({ error: "Failed to start checkout" }, { status: 500 });
    }

    return NextResponse.redirect(checkoutSession.url, { status: 303 });
  } catch (error) {
    console.error("stripe.checkout.session_create_failed", { userId: user.id, stripeCustomerId, error });
    return Response.json({ error: "Failed to start checkout" }, { status: 500 });
  }
}

