import { eq } from "drizzle-orm";
import Stripe from "stripe";

import { db } from "../../../../lib/db/client";
import { users } from "../../../../lib/db/schema";
import { readRequiredEnv } from "../../../../lib/env/read-required-env";
import { getPlanForPriceId } from "../../../../lib/stripe/constants";

type UserForStripeWebhook = {
  id: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeLastWebhookEventId: string | null;
  stripeLastWebhookEventCreated: bigint | null;
};

type StripeWebhookContext = {
  eventId: string;
  eventType: string;
  customerId: string;
  subscriptionId: string | null;
  priceId: unknown;
  eventCreated: bigint | null;
  object: any;
  user: UserForStripeWebhook;
};

function toUnixSecondsBigint(value: unknown): bigint | null {
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.floor(value));
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? BigInt(Math.floor(parsed)) : null;
  }
  if (typeof value === "bigint") return value;
  return null;
}

function toUnixSecondsDate(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(Math.floor(value) * 1000);
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? new Date(Math.floor(parsed) * 1000) : null;
  }
  if (typeof value === "bigint") {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? new Date(parsed * 1000) : null;
  }
  return null;
}

function getExpandedId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object" && "id" in value && typeof (value as { id?: unknown }).id === "string") {
    const id = (value as { id: string }).id;
    return id.length > 0 ? id : null;
  }
  return null;
}

function shouldIgnoreEvent(user: UserForStripeWebhook, eventId: string, eventCreated: bigint | null): boolean {
  if (user.stripeLastWebhookEventId && user.stripeLastWebhookEventId === eventId) return true;
  if (eventCreated && user.stripeLastWebhookEventCreated && eventCreated < user.stripeLastWebhookEventCreated) return true;
  return false;
}

async function findUserByStripeCustomerId(customerId: string): Promise<UserForStripeWebhook | null> {
  const rows = await db
    .select({
      id: users.id,
      plan: users.plan,
      stripeCustomerId: users.stripeCustomerId,
      stripeLastWebhookEventId: users.stripeLastWebhookEventId,
      stripeLastWebhookEventCreated: users.stripeLastWebhookEventCreated,
    })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId));

  return rows[0] ?? null;
}

function stripeEventMetadata(event: any) {
  const eventId = typeof event?.id === "string" ? event.id : "unknown";
  const eventType = typeof event?.type === "string" ? event.type : "unknown";
  const eventCreated = toUnixSecondsBigint(event?.created);
  const object = event?.data?.object;

  const customerId =
    typeof object?.customer === "string"
      ? object.customer
      : typeof object?.customer?.id === "string"
        ? object.customer.id
        : null;

  const subscriptionId =
    typeof object?.subscription === "string"
      ? object.subscription
      : typeof object?.id === "string" && (object?.object === "subscription" || eventType.startsWith("customer.subscription."))
        ? object.id
        : null;

  return {
    eventId,
    eventType,
    eventCreated,
    object,
    customerId,
    subscriptionId,
    priceId: object?.items?.data?.[0]?.price?.id,
  };
}

async function handleCheckoutSessionCompleted(context: StripeWebhookContext): Promise<void> {
  const checkoutSubscriptionId = getExpandedId(context.object?.subscription);
  if (!checkoutSubscriptionId) {
    console.info("stripe.webhook.checkout_session_completed.no_subscription", {
      eventId: context.eventId,
      customerId: context.customerId,
    });
    return;
  }

  await db
    .update(users)
    .set({
      stripeSubscriptionId: checkoutSubscriptionId,
      stripeLastWebhookEventId: context.eventId,
      stripeLastWebhookEventCreated: context.eventCreated,
    })
    .where(eq(users.id, context.user.id));
}

function subscriptionCancellationState(object: any): {
  currentPeriodEndDate: Date | null;
  cancelAtPeriodEnd: boolean;
} {
  const cancelAtDate = toUnixSecondsDate(object?.cancel_at);
  const hasScheduledCancellation = !!cancelAtDate && (object?.canceled_at === null || object?.canceled_at === undefined);
  return {
    currentPeriodEndDate: toUnixSecondsDate(object?.current_period_end) ?? cancelAtDate,
    cancelAtPeriodEnd:
      typeof object?.cancel_at_period_end === "boolean"
        ? object.cancel_at_period_end || hasScheduledCancellation
        : hasScheduledCancellation,
  };
}

async function handleSubscriptionUpdated(context: StripeWebhookContext): Promise<void> {
  const { eventId, eventType, customerId, subscriptionId, priceId, object, user, eventCreated } = context;
  const mappedPlan = typeof priceId === "string" ? getPlanForPriceId(priceId) : null;
  if (!mappedPlan && typeof priceId === "string") {
    console.error("stripe.webhook.unknown_price_id", {
      eventId,
      eventType,
      customerId,
      subscriptionId,
      priceId,
      userId: user.id,
    });
  }

  const cancellation = subscriptionCancellationState(object);

  const setValues: Record<string, unknown> = {
    stripeSubscriptionId: subscriptionId,
    stripeSubscriptionStatus: typeof object?.status === "string" ? object.status : null,
    stripePriceId: typeof priceId === "string" ? priceId : null,
    stripeCurrentPeriodEnd: cancellation.currentPeriodEndDate,
    stripeCancelAtPeriodEnd: cancellation.cancelAtPeriodEnd,
    stripeLastWebhookEventId: eventId,
    stripeLastWebhookEventCreated: eventCreated,
  };

  if (mappedPlan) setValues.plan = mappedPlan;

  await db.update(users).set(setValues).where(eq(users.id, user.id));
}

async function handleSubscriptionDeleted(context: StripeWebhookContext): Promise<void> {
  const status = typeof context.object?.status === "string" ? context.object.status : null;
  await db
    .update(users)
    .set({
      plan: "free",
      stripeSubscriptionStatus: status,
      stripeLastWebhookEventId: context.eventId,
      stripeLastWebhookEventCreated: context.eventCreated,
    })
    .where(eq(users.id, context.user.id));
}

async function handleInvoicePaymentFailed(context: StripeWebhookContext): Promise<void> {
  await db
    .update(users)
    .set({
      stripeSubscriptionId: context.subscriptionId,
      stripeSubscriptionStatus: "past_due",
      stripeLastWebhookEventId: context.eventId,
      stripeLastWebhookEventCreated: context.eventCreated,
    })
    .where(eq(users.id, context.user.id));
}

const webhookHandlers: Partial<Record<string, (context: StripeWebhookContext) => Promise<void>>> = {
  "checkout.session.completed": handleCheckoutSessionCompleted,
  "customer.subscription.updated": handleSubscriptionUpdated,
  "customer.subscription.deleted": handleSubscriptionDeleted,
  "invoice.payment_failed": handleInvoicePaymentFailed,
};

export async function POST(request: Request): Promise<Response> {
  const signatureHeader = request.headers.get("stripe-signature");
  if (!signatureHeader) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  const secret = readRequiredEnv("STRIPE_WEBHOOK_SECRET");
  const body = await request.text();

  let event: any;
  try {
    event = Stripe.webhooks.constructEvent(body, signatureHeader, secret);
  } catch (error) {
    console.error("stripe.webhook.signature_verification_failed", { error });
    return new Response("Invalid Stripe signature", { status: 400 });
  }

  const { eventId, eventType, eventCreated, object, customerId, subscriptionId, priceId } =
    stripeEventMetadata(event);

  if (!customerId) {
    console.error("stripe.webhook.missing_customer", { eventId, eventType, subscriptionId, priceId });
    return Response.json({ ok: true }, { status: 200 });
  }

  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    console.error("stripe.webhook.user_not_found", { eventId, eventType, customerId, subscriptionId, priceId });
    return Response.json({ ok: true }, { status: 200 });
  }

  if (shouldIgnoreEvent(user, eventId, eventCreated)) {
    return Response.json({ ok: true, ignored: true }, { status: 200 });
  }

  try {
    const handler = webhookHandlers[eventType];
    if (handler) {
      await handler({ eventId, eventType, customerId, subscriptionId, priceId, eventCreated, object, user });
    } else {
      console.info("stripe.webhook.unhandled_event", { eventId, eventType, customerId, subscriptionId, priceId });
    }
  } catch (error) {
    console.error("stripe.webhook.processing_failed", { eventId, eventType, customerId, subscriptionId, priceId, error });
    return new Response("Webhook handler error", { status: 500 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
