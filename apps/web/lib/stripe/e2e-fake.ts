import crypto from "node:crypto";

import Stripe from "stripe";

type FakeCheckoutSession = {
  id: string;
  customer: string;
  subscription: {
    id: string;
    object: "subscription";
    customer: string;
    status: string;
    cancel_at: null;
    canceled_at: null;
    cancel_at_period_end: boolean;
    current_period_end: number;
    metadata: Record<string, string>;
    items: { data: Array<{ price: { id: string } }> };
  };
};

type FakeStripeStore = {
  sessions: Map<string, FakeCheckoutSession>;
};

function fakeId(prefix: string): string {
  return `${prefix}_e2e_${crypto.randomBytes(10).toString("hex")}`;
}

function getStore(): FakeStripeStore {
  const globalScope = globalThis as unknown as {
    __fastPrAnalyticsE2EStripeFake?: FakeStripeStore;
  };
  globalScope.__fastPrAnalyticsE2EStripeFake ??= { sessions: new Map() };
  return globalScope.__fastPrAnalyticsE2EStripeFake;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function shouldUseE2EStripeFake(): boolean {
  return process.env.E2E_TEST_MODE === "1" && process.env.E2E_STRIPE_FAKE === "1" && !isProduction();
}

export function createE2EStripeFake(secretKey: string, apiVersion: string): unknown {
  const realStripe = new Stripe(secretKey, { apiVersion: apiVersion as Stripe.LatestApiVersion });
  const { sessions } = getStore();

  return {
    customers: {
      create: async (params: { email?: string; metadata?: { userId?: string } }) => {
        const userHint = params.metadata?.userId ? params.metadata.userId.replaceAll("-", "").slice(0, 12) : crypto.randomBytes(6).toString("hex");
        return { id: `cus_e2e_${userHint}`, email: params.email ?? null, metadata: params.metadata ?? {} };
      },
    },
    subscriptions: {
      list: async (params: { customer?: string }) => {
        const customer = params.customer ?? "";
        const stored = Array.from(sessions.values())
          .filter((session) => session.customer === customer)
          .map((session) => session.subscription);
        if (stored.length > 0) return { data: stored };

        if (customer.includes("_active_")) {
          return {
            data: [
              {
                id: fakeId("sub"),
                object: "subscription",
                customer,
                status: "active",
                items: { data: [{ price: { id: process.env.STRIPE_PRICE_PRO ?? "price_e2e_pro" } }] },
              },
            ],
          };
        }

        return { data: [] };
      },
    },
    checkout: {
      sessions: {
        create: async (params: {
          customer?: string;
          line_items?: Array<{ price?: string }>;
          subscription_data?: { metadata?: Record<string, string> };
          success_url?: string;
        }) => {
          const id = fakeId("cs");
          const customer = params.customer ?? fakeId("cus");
          const subscriptionId = fakeId("sub");
          const priceId = params.line_items?.[0]?.price ?? process.env.STRIPE_PRICE_PRO ?? "price_e2e_pro";
          const subscription = {
            id: subscriptionId,
            object: "subscription" as const,
            customer,
            status: "active",
            cancel_at: null,
            canceled_at: null,
            cancel_at_period_end: false,
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            metadata: params.subscription_data?.metadata ?? {},
            items: { data: [{ price: { id: priceId } }] },
          };
          sessions.set(id, { id, customer, subscription });

          const successUrl = params.success_url ?? "http://localhost:3000/settings?checkout_session_id={CHECKOUT_SESSION_ID}";
          return { id, url: successUrl.replace("{CHECKOUT_SESSION_ID}", id) };
        },
        retrieve: async (id: string) => {
          const session = sessions.get(id);
          if (!session) {
            throw new Error(`Unknown E2E checkout session: ${id}`);
          }

          return {
            id: session.id,
            customer: { id: session.customer },
            subscription: session.subscription,
          };
        },
      },
    },
    billingPortal: {
      sessions: {
        create: async (params: { customer: string; return_url?: string; configuration?: string }) => {
          return {
            id: fakeId("bps"),
            customer: params.customer,
            url: `https://billing.stripe.test/session/${encodeURIComponent(params.customer)}`,
            return_url: params.return_url ?? null,
            configuration: params.configuration ?? null,
          };
        },
      },
    },
    webhooks: realStripe.webhooks,
  };
}
