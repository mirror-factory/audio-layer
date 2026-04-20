export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { getStripe, tierForPriceId } from "@/lib/stripe/client";
import { setSubscriptionState } from "@/lib/stripe/profiles";
import type Stripe from "stripe";

export const POST = withRoute(async (req, ctx) => {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 503 },
    );
  }

  // CRITICAL: read raw body BEFORE any JSON parsing
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Handle events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription && session.customer) {
        const sub = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );
        await syncSubscription(sub);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(subscription);
      break;
    }

    default:
      // Unhandled event type -- acknowledge receipt
      break;
  }

  return NextResponse.json({ received: true });
});

async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const firstItem = sub.items.data[0];
  const priceId = firstItem?.price?.id;
  const tier = priceId ? tierForPriceId(priceId) : null;

  const status = sub.status === "active" || sub.status === "trialing"
    ? sub.status
    : sub.status === "canceled"
      ? "canceled"
      : sub.status;

  // current_period_end lives on the subscription item in newer Stripe API versions
  const periodEnd = firstItem?.current_period_end;

  await setSubscriptionState({
    stripeCustomerId: customerId,
    status,
    tier,
    currentPeriodEnd: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
  });
}
