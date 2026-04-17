/**
 * POST /api/stripe/webhook
 *
 * Stripe calls this on subscription lifecycle events. We verify the
 * signature against STRIPE_WEBHOOK_SECRET and persist the resulting
 * subscription state into the profiles table (keyed by Stripe
 * customer id).
 *
 * Local dev: run `stripe listen --forward-to localhost:3000/api/stripe/webhook`
 * to get a webhook secret and forward events.
 *
 * IMPORTANT: route uses the raw request body (no JSON parsing
 * before signature verification) — Next.js App Router gives us the
 * raw text via request.text().
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, tierForPriceId } from "@/lib/stripe/client";
import { setSubscriptionState } from "@/lib/stripe/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(request: Request): Promise<NextResponse> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    // Acknowledge but no-op — Stripe only retries on non-2xx.
    return NextResponse.json({ received: true, ignored: event.type });
  }

  try {
    await processEvent(stripe, event);
  } catch (err) {
    console.error("Stripe webhook processing failed", err);
    // 500 triggers a retry from Stripe.
    return NextResponse.json(
      { error: `Processing failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function processEvent(stripe: Stripe, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (!customerId || !subId) return;
      const sub = await stripe.subscriptions.retrieve(subId);
      await syncSubscription(customerId, sub);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await syncSubscription(customerId, sub);
      return;
    }
  }
}

async function syncSubscription(
  customerId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  const priceId = sub.items.data[0]?.price?.id;
  const tier = priceId ? tierForPriceId(priceId) : null;
  // current_period_end is a unix timestamp (seconds). Older Stripe
  // SDK types may omit it from the public types; cast and guard.
  const cpe = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  const currentPeriodEnd =
    typeof cpe === "number" ? new Date(cpe * 1000).toISOString() : null;
  await setSubscriptionState(customerId, {
    status: sub.status,
    tier,
    currentPeriodEnd,
  });
}
