/**
 * Profile read/write helpers — bridge between Supabase auth users
 * and Stripe customer / subscription state.
 *
 * All writes go through the SERVICE-ROLE Supabase client because:
 *   - The Stripe webhook is anonymous from the user's perspective
 *     (no cookie session) so the anon-role client can't satisfy
 *     the `auth.uid() = user_id` policy.
 *   - The checkout flow needs to upsert before redirecting, which
 *     also benefits from skipping RLS round-trips.
 *
 * RLS still protects READS through the cookie-bound client.
 */

import { getSupabaseServer } from "@/lib/supabase/server";
import type { SubscriptionTier } from "./client";

const TABLE = "profiles";

export interface Profile {
  userId: string;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  subscriptionTier: SubscriptionTier | null;
  currentPeriodEnd: string | null;
}

interface ProfileRow {
  user_id: string;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  subscription_tier: SubscriptionTier | null;
  current_period_end: string | null;
}

function fromRow(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    stripeCustomerId: row.stripe_customer_id,
    subscriptionStatus: row.subscription_status,
    subscriptionTier: row.subscription_tier,
    currentPeriodEnd: row.current_period_end,
  };
}

function requireServiceClient() {
  const supabase = getSupabaseServer();
  if (!supabase) {
    throw new Error(
      "Supabase service-role client is not configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required for billing).",
    );
  }
  return supabase;
}

export async function getOrCreateProfile(userId: string): Promise<Profile> {
  const supabase = requireServiceClient();
  const existing = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();
  if (existing.error) {
    throw new Error(`Profile read failed: ${existing.error.message}`);
  }
  if (existing.data) return fromRow(existing.data);

  const inserted = await supabase
    .from(TABLE)
    .insert({ user_id: userId })
    .select("*")
    .single<ProfileRow>();
  if (inserted.error) {
    throw new Error(`Profile insert failed: ${inserted.error.message}`);
  }
  return fromRow(inserted.data);
}

export async function setStripeCustomerId(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  const supabase = requireServiceClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("user_id", userId);
  if (error) throw new Error(`Profile update failed: ${error.message}`);
}

export async function setSubscriptionState(
  stripeCustomerId: string,
  patch: {
    status: string | null;
    tier: SubscriptionTier | null;
    currentPeriodEnd: string | null;
  },
): Promise<void> {
  const supabase = requireServiceClient();
  const { error } = await supabase
    .from(TABLE)
    .update({
      subscription_status: patch.status,
      subscription_tier: patch.tier,
      current_period_end: patch.currentPeriodEnd,
    })
    .eq("stripe_customer_id", stripeCustomerId);
  if (error) {
    throw new Error(`Subscription state update failed: ${error.message}`);
  }
}
