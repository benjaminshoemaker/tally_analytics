import Stripe from "stripe";

import { readRequiredEnv } from "../env/read-required-env";
import { createE2EStripeFake, shouldUseE2EStripeFake } from "./e2e-fake";

export const STRIPE_API_VERSION = "2025-12-15.clover";

let stripeClient: Stripe | null = null;
let e2eStripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (shouldUseE2EStripeFake()) {
    if (!e2eStripeClient) {
      e2eStripeClient = createE2EStripeFake(readRequiredEnv("STRIPE_SECRET_KEY"), STRIPE_API_VERSION) as Stripe;
    }
    return e2eStripeClient;
  }

  if (stripeClient) return stripeClient;

  stripeClient = new Stripe(readRequiredEnv("STRIPE_SECRET_KEY"), {
    apiVersion: STRIPE_API_VERSION,
  });
  return stripeClient;
}
