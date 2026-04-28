/**
 * Dynamic quota check.
 * Plan limits come from the active admin pricing config. Active subscribers
 * use their subscription tier; everyone else uses the free plan.
 * Fails open on transient DB errors (never locks users out).
 */

import { getSupabaseUser } from "@/lib/supabase/user";
import { getActivePricingConfig, planForTier } from "@/lib/billing/pricing-config";

export const FREE_TIER_MEETING_LIMIT = 25;

export interface QuotaResult {
  allowed: boolean;
  meetingCount: number;
  monthlyMeetingCount: number;
  monthlyMinutesUsed: number;
  limit: number;
  meetingLimit: number | null;
  meetingLimitPeriod: "lifetime" | "monthly";
  minuteLimit: number | null;
  planId: string;
  isSubscriber: boolean;
  bypassed?: boolean;
  reason?: "meeting_limit" | "minute_limit";
}

function truthyEnv(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function quotaBypassEnabled(): boolean {
  const requested = truthyEnv(
    process.env.LAYER_ONE_BYPASS_QUOTA?.toLowerCase() ??
      process.env.BYPASS_MEETING_LIMITS?.toLowerCase(),
  );
  if (!requested) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return truthyEnv(process.env.LAYER_ONE_ALLOW_PROD_QUOTA_BYPASS?.toLowerCase());
}

export async function checkQuota(): Promise<QuotaResult> {
  if (quotaBypassEnabled()) {
    return {
      allowed: true,
      meetingCount: 0,
      monthlyMeetingCount: 0,
      monthlyMinutesUsed: 0,
      limit: Infinity,
      meetingLimit: null,
      meetingLimitPeriod: "monthly",
      minuteLimit: null,
      planId: "bypass-unlimited",
      isSubscriber: true,
      bypassed: true,
    };
  }

  const pricing = await getActivePricingConfig();
  const fallbackPlan = planForTier(pricing, "free");

  const fallback: QuotaResult = {
    allowed: true,
    meetingCount: 0,
    monthlyMeetingCount: 0,
    monthlyMinutesUsed: 0,
    limit: fallbackPlan.meetingLimit ?? FREE_TIER_MEETING_LIMIT,
    meetingLimit: fallbackPlan.meetingLimit ?? FREE_TIER_MEETING_LIMIT,
    meetingLimitPeriod: fallbackPlan.meetingLimitPeriod ?? "lifetime",
    minuteLimit: fallbackPlan.monthlyMinuteLimit ?? null,
    planId: fallbackPlan.id,
    isSubscriber: false,
  };

  const supabase = await getSupabaseUser();

  // Without Supabase configured, quota does not apply
  if (!supabase) return fallback;

  try {
    // Check subscription status
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return fallback;

    // Check if user has an active subscription
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, subscription_tier")
      .eq("user_id", user.id)
      .single();

    const isSubscriber =
      profile?.subscription_status === "active" ||
      profile?.subscription_status === "trialing";

    const plan = planForTier(
      pricing,
      isSubscriber ? (profile?.subscription_tier as string | null) : "free",
    );

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    // Count user's meetings (RLS filters automatically).
    const { data: meetings, error } = await supabase
      .from("meetings")
      .select("id, duration_seconds, created_at");

    if (error) {
      // Fail open on transient DB errors
      console.warn("[quota] Error counting meetings, failing open:", error.message);
      return fallback;
    }

    const rows = meetings ?? [];
    const meetingCount = rows.length;
    const monthlyRows = rows.filter((meeting) =>
      new Date(meeting.created_at) >= monthStart,
    );
    const monthlyMeetingCount = monthlyRows.length;
    const monthlyMinutesUsed = Math.round(
      monthlyRows.reduce(
        (sum, meeting) => sum + Number(meeting.duration_seconds ?? 0) / 60,
        0,
      ),
    );
    const meetingLimit = plan.meetingLimit ?? null;
    const meetingLimitPeriod = plan.meetingLimitPeriod ?? "monthly";
    const meetingCountForLimit =
      meetingLimitPeriod === "lifetime" ? meetingCount : monthlyMeetingCount;
    const minuteLimit = plan.monthlyMinuteLimit ?? null;
    const overMeetingLimit = meetingLimit !== null && meetingCountForLimit >= meetingLimit;
    const overMinuteLimit = minuteLimit !== null && monthlyMinutesUsed >= minuteLimit;

    return {
      allowed: !overMeetingLimit && !overMinuteLimit,
      meetingCount,
      monthlyMeetingCount,
      monthlyMinutesUsed,
      limit: meetingLimit ?? Infinity,
      meetingLimit,
      meetingLimitPeriod,
      minuteLimit,
      planId: plan.id,
      isSubscriber,
      reason: overMeetingLimit ? "meeting_limit" : overMinuteLimit ? "minute_limit" : undefined,
    };
  } catch (err) {
    // Fail open on any unexpected error
    console.warn("[quota] Unexpected error, failing open:", err);
    return fallback;
  }
}
