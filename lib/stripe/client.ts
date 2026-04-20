/**
 * Stripe SDK singleton and tier mapping.
 * Returns null when STRIPE_SECRET_KEY is missing.
 */

import Stripe from "stripe";

let instance: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (instance) return instance;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  instance = new Stripe(secretKey);
  return instance;
}

/**
 * Map a subscription tier to its Stripe Price ID (from env).
 */
export function priceIdForTier(
  tier: "core" | "pro",
): string | null {
  if (tier === "core") return process.env.STRIPE_PRICE_CORE ?? null;
  if (tier === "pro") return process.env.STRIPE_PRICE_PRO ?? null;
  return null;
}

/**
 * Map a Stripe Price ID back to a tier name.
 */
export function tierForPriceId(
  priceId: string,
): "core" | "pro" | null {
  if (priceId === process.env.STRIPE_PRICE_CORE) return "core";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return null;
}
