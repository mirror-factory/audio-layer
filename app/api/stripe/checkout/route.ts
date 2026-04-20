export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { withExternalCall } from "@/lib/with-external";
import { getStripe, priceIdForTier } from "@/lib/stripe/client";
import { getCurrentUserId } from "@/lib/supabase/user";
import {
  getOrCreateProfile,
  setStripeCustomerId,
} from "@/lib/stripe/profiles";

export const POST = withRoute(async (req, ctx) => {
  const { tier } = (await req.json()) as { tier: "core" | "pro" };

  if (tier !== "core" && tier !== "pro") {
    return NextResponse.json(
      { error: "Invalid tier. Must be 'core' or 'pro'." },
      { status: 400 },
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 },
    );
  }

  const priceId = priceIdForTier(tier);
  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID not configured for tier "${tier}"` },
      { status: 503 },
    );
  }

  // Get or create Stripe customer
  const profile = await getOrCreateProfile(userId);
  let customerId = profile?.stripe_customer_id as string | null;

  if (!customerId) {
    const customer = await withExternalCall(
      { vendor: "stripe", operation: "customers.create", requestId: ctx.requestId },
      () =>
        stripe.customers.create({
          metadata: { userId },
        }),
    );
    customerId = customer.id;
    await setStripeCustomerId(userId, customerId);
  }

  // Create checkout session
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await withExternalCall(
    { vendor: "stripe", operation: "checkout.sessions.create", requestId: ctx.requestId },
    () =>
      stripe.checkout.sessions.create({
        customer: customerId!,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/usage?checkout=success`,
        cancel_url: `${appUrl}/pricing?checkout=canceled`,
        metadata: { userId, tier },
      }),
  );

  return NextResponse.json({ url: session.url });
});
