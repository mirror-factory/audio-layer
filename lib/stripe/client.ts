/**
 * Stripe SDK factory.
 *
 * Returns null when STRIPE_SECRET_KEY is missing so dev mode runs
 * without billing wired up. Production must set the secret + the two
 * STRIPE_PRICE_* IDs to enable checkout.
 */

import Stripe from "stripe";

let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    cached = null;
    return null;
  }
  cached = new Stripe(key, {
    typescript: true,
    appInfo: { name: "audio-layer" },
  });
  return cached;
}

/** Test seam */
export function __resetStripeClient(): void {
  cached = undefined;
}

export type SubscriptionTier = "core" | "pro";

export function priceIdForTier(tier: SubscriptionTier): string | null {
  if (tier === "core") return process.env.STRIPE_PRICE_CORE ?? null;
  if (tier === "pro") return process.env.STRIPE_PRICE_PRO ?? null;
  return null;
}

export function tierForPriceId(priceId: string): SubscriptionTier | null {
  if (priceId === process.env.STRIPE_PRICE_CORE) return "core";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return null;
}
