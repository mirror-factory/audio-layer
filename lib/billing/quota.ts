/**
 * Free tier quota check.
 * 25 meetings lifetime on free tier. Active subscriptions bypass the limit.
 * Fails open on transient DB errors (never locks users out).
 */

import { getSupabaseUser } from "@/lib/supabase/user";

export const FREE_TIER_MEETING_LIMIT = 25;

export interface QuotaResult {
  allowed: boolean;
  meetingCount: number;
  limit: number;
  isSubscriber: boolean;
}

export async function checkQuota(): Promise<QuotaResult> {
  const supabase = await getSupabaseUser();

  // Without Supabase configured, quota does not apply
  if (!supabase) {
    return {
      allowed: true,
      meetingCount: 0,
      limit: FREE_TIER_MEETING_LIMIT,
      isSubscriber: false,
    };
  }

  try {
    // Check subscription status
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        allowed: true,
        meetingCount: 0,
        limit: FREE_TIER_MEETING_LIMIT,
        isSubscriber: false,
      };
    }

    // Check if user has an active subscription
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("user_id", user.id)
      .single();

    const isSubscriber =
      profile?.subscription_status === "active" ||
      profile?.subscription_status === "trialing";

    if (isSubscriber) {
      return {
        allowed: true,
        meetingCount: 0,
        limit: Infinity,
        isSubscriber: true,
      };
    }

    // Count user's meetings (RLS filters automatically)
    const { count, error } = await supabase
      .from("meetings")
      .select("id", { count: "exact", head: true });

    if (error) {
      // Fail open on transient DB errors
      console.warn("[quota] Error counting meetings, failing open:", error.message);
      return {
        allowed: true,
        meetingCount: 0,
        limit: FREE_TIER_MEETING_LIMIT,
        isSubscriber: false,
      };
    }

    const meetingCount = count ?? 0;

    return {
      allowed: meetingCount < FREE_TIER_MEETING_LIMIT,
      meetingCount,
      limit: FREE_TIER_MEETING_LIMIT,
      isSubscriber: false,
    };
  } catch (err) {
    // Fail open on any unexpected error
    console.warn("[quota] Unexpected error, failing open:", err);
    return {
      allowed: true,
      meetingCount: 0,
      limit: FREE_TIER_MEETING_LIMIT,
      isSubscriber: false,
    };
  }
}
