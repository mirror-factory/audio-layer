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
import { checkoutRedirectUrls } from "@/lib/stripe/checkout-urls";

export const POST = withRoute(async (req, ctx) => {
  let body: { tier?: unknown };
  try {
    body = (await req.json()) as { tier?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid checkout request body" },
      { status: 400 },
    );
  }

  const { tier } = body;

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
      {
        error: "Stripe Checkout is not configured. Missing STRIPE_SECRET_KEY.",
        code: "stripe_missing_secret_key",
        missingEnv: ["STRIPE_SECRET_KEY"],
      },
      { status: 503 },
    );
  }

  const priceId = priceIdForTier(tier);
  if (!priceId) {
    const missingEnv = tier === "core" ? "STRIPE_PRICE_CORE" : "STRIPE_PRICE_PRO";
    const planLabel = tier === "core" ? "Core ($20/mo)" : "Pro ($30/mo)";

    return NextResponse.json(
      {
        error: `Stripe Checkout is missing ${missingEnv} for ${planLabel}. Add the Stripe Price ID, then redeploy.`,
        code: "stripe_missing_price_id",
        missingEnv: [missingEnv],
      },
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

  const { successUrl, cancelUrl } = checkoutRedirectUrls(req);

  const session = await withExternalCall(
    { vendor: "stripe", operation: "checkout.sessions.create", requestId: ctx.requestId },
    () =>
      stripe.checkout.sessions.create({
        customer: customerId!,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId, tier },
      }),
  );

  return NextResponse.json({ url: session.url });
});
