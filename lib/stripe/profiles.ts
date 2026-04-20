/**
 * Stripe profile management via service-role Supabase client.
 * Used by Stripe webhook and checkout flow.
 */

import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Get or create a profile row for a user.
 * Returns the profile data or null if Supabase is not configured.
 */
export async function getOrCreateProfile(userId: string) {
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  // Try to fetch existing
  const { data: existing } = await supabase
    .from("profiles")
    .select()
    .eq("user_id", userId)
    .single();

  if (existing) return existing;

  // Create new
  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) {
    console.error("[profiles] Failed to create profile:", error.message);
    return null;
  }

  return created;
}

/**
 * Set the Stripe customer ID on a user's profile.
 */
export async function setStripeCustomerId(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  await getOrCreateProfile(userId);

  const { error } = await supabase
    .from("profiles")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("user_id", userId);

  if (error) {
    console.error(
      "[profiles] Failed to set Stripe customer ID:",
      error.message,
    );
  }
}

/**
 * Update subscription state on a user's profile.
 * Called from Stripe webhook handlers.
 */
export async function setSubscriptionState(opts: {
  userId?: string;
  stripeCustomerId: string;
  status: string | null;
  tier: string | null;
  currentPeriodEnd: string | null;
}): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  const patch = {
    subscription_status: opts.status,
    subscription_tier: opts.tier,
    current_period_end: opts.currentPeriodEnd,
  };

  // Try to match by stripe_customer_id first
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("stripe_customer_id", opts.stripeCustomerId);

  if (error) {
    console.error(
      "[profiles] Failed to set subscription state:",
      error.message,
    );
  }
}
