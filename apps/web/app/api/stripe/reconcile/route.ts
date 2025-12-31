import { eq } from "drizzle-orm";

import { validateSession } from "../../../../lib/auth/session";
import { db } from "../../../../lib/db/client";
import { users } from "../../../../lib/db/schema";
import { getPlanForPriceId } from "../../../../lib/stripe/constants";
import { getStripe } from "../../../../lib/stripe/client";

type ReconcileBody = {
  checkout_session_id?: unknown;
};

function getExpandedId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object" && "id" in value && typeof (value as { id?: unknown }).id === "string") {
    const id = (value as { id: string }).id;
    return id.length > 0 ? id : null;
  }
  return null;
}

function getUnixSecondsDate(value: unknown): Date | null {
  let seconds: number | null = null;

  if (typeof value === "number" && Number.isFinite(value)) {
    seconds = Math.floor(value);
  } else if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      seconds = Math.floor(parsed);
    }
  } else if (typeof value === "bigint") {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) {
      seconds = parsed;
    }
  }

  if (seconds === null) return null;
  return new Date(seconds * 1000);
}

export async function POST(request: Request): Promise<Response> {
  const session = await validateSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = json as ReconcileBody;
  const checkoutSessionId = typeof body.checkout_session_id === "string" ? body.checkout_session_id : null;
  if (!checkoutSessionId) {
    return Response.json({ error: "Missing checkout_session_id" }, { status: 400 });
  }

  const userRows = await db
    .select({ id: users.id, plan: users.plan, stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, session.userId));
  const user = userRows[0];
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const stripe = getStripe();

  let checkoutSession: any;
  try {
    checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ["subscription", "customer"],
    });
  } catch (error) {
    console.error("stripe.reconcile.checkout_session_retrieve_failed", { checkoutSessionId, error });
    return Response.json({ error: "Invalid checkout_session_id" }, { status: 400 });
  }

  const customerId = getExpandedId(checkoutSession?.customer);
  const subscription = checkoutSession?.subscription;
  const subscriptionId = getExpandedId(subscription);

  const belongsToCustomer = !!(customerId && user.stripeCustomerId && customerId === user.stripeCustomerId);
  const belongsToUserMetadata = subscription?.metadata?.userId === user.id;
  if (!belongsToCustomer && !belongsToUserMetadata) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!subscriptionId || !subscription || typeof subscription !== "object") {
    return Response.json({ error: "Checkout session missing subscription" }, { status: 400 });
  }

  const priceId = subscription?.items?.data?.[0]?.price?.id;
  const mappedPlan = typeof priceId === "string" ? getPlanForPriceId(priceId) : null;

  const newPlan = mappedPlan ?? user.plan;

  const updatedRows = await db
    .update(users)
    .set({
      plan: newPlan,
      stripeSubscriptionId: subscriptionId,
      stripeSubscriptionStatus: typeof subscription.status === "string" ? subscription.status : null,
      stripePriceId: typeof priceId === "string" ? priceId : null,
      stripeCurrentPeriodEnd: getUnixSecondsDate(subscription.current_period_end),
      stripeCancelAtPeriodEnd: typeof subscription.cancel_at_period_end === "boolean" ? subscription.cancel_at_period_end : null,
    })
    .where(eq(users.id, user.id))
    .returning();

  const updated = updatedRows[0];
  if (!updated) {
    return Response.json({ error: "Failed to update subscription" }, { status: 500 });
  }

  return Response.json({ plan: updated.plan, stripeSubscriptionId: updated.stripeSubscriptionId });
}
