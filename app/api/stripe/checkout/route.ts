/**
 * POST /api/stripe/checkout
 *
 * Body: { tier: "core" | "pro" }
 * Returns: { url } — the Stripe-hosted Checkout Session URL.
 *
 * Auth: requires a Supabase session (anonymous is fine — Stripe gets
 * the email from Checkout if the user enters one). Idempotently
 * creates a Stripe customer and stores the id on the profiles row,
 * so repeat checkouts reuse the same customer.
 *
 * Returns 503 when Stripe isn't configured. The /pricing page knows
 * to surface a helpful message in that case.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe, priceIdForTier } from "@/lib/stripe/client";
import {
  getOrCreateProfile,
  setStripeCustomerId,
} from "@/lib/stripe/profiles";
import { getCurrentUserId } from "@/lib/supabase/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  tier: z.enum(["core", "pro"]),
});

export async function POST(request: Request): Promise<NextResponse> {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Billing is not configured (STRIPE_SECRET_KEY missing)." },
      { status: 503 },
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "No session — middleware should have signed you in." },
      { status: 401 },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid body: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  const priceId = priceIdForTier(body.tier);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `STRIPE_PRICE_${body.tier.toUpperCase()} is not set in env.`,
      },
      { status: 503 },
    );
  }

  // Resolve / create the Stripe customer for this user.
  const profile = await getOrCreateProfile(userId);
  let customerId = profile.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { user_id: userId },
    });
    customerId = customer.id;
    await setStripeCustomerId(userId, customerId);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/pricing?status=success`,
    cancel_url: `${appUrl}/pricing?status=canceled`,
    allow_promotion_codes: true,
    client_reference_id: userId,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL." },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: session.url });
}
