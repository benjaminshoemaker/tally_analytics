import Stripe from "stripe";

import { readRequiredEnv } from "../env/read-required-env";

export const STRIPE_API_VERSION = "2025-12-15.clover";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  stripeClient = new Stripe(readRequiredEnv("STRIPE_SECRET_KEY"), {
    apiVersion: STRIPE_API_VERSION,
  });
  return stripeClient;
}
