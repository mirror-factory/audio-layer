/**
 * Usage summary aggregator.
 * Pulls cost data from MeetingsStore and profiles from Supabase.
 */

import type { UsageSummary, MeetingCostBreakdown } from "./types";
import { FREE_TIER_MEETING_LIMIT, quotaBypassEnabled } from "./quota";
import { getActivePricingConfig, planForTier } from "@/lib/billing/pricing-config";
import { getSupabaseUser } from "@/lib/supabase/user";

export async function getUsageSummary(): Promise<UsageSummary> {
  const supabase = await getSupabaseUser();
  const pricing = await getActivePricingConfig();
  const freePlan = planForTier(pricing, "free");
  const quotaBypass = quotaBypassEnabled();
  const freeLimit = freePlan.meetingLimit ?? FREE_TIER_MEETING_LIMIT;

  const empty: UsageSummary = {
    quotaBypass,
    meetings: {
      total: 0,
      thisMonth: 0,
      freeLimit: quotaBypass ? Infinity : freeLimit,
      freeRemaining: quotaBypass ? Infinity : freeLimit,
      activePlanId: quotaBypass ? "bypass-unlimited" : freePlan.id,
      meetingLimit: quotaBypass ? null : freeLimit,
      meetingLimitPeriod: freePlan.meetingLimitPeriod ?? "lifetime",
    },
    minutes: {
      total: 0,
      thisMonth: 0,
      monthlyLimit: quotaBypass ? null : freePlan.monthlyMinuteLimit ?? null,
      monthlyRemaining: quotaBypass ? null : freePlan.monthlyMinuteLimit ?? null,
    },
    stt: { totalCostUsd: 0, thisMonthCostUsd: 0 },
    llm: {
      totalCostUsd: 0,
      thisMonthCostUsd: 0,
      totalTokens: 0,
      source: "unavailable",
    },
    subscription: {
      tier: null,
      status: null,
      currentPeriodEnd: null,
    },
  };

  if (!supabase) return empty;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return empty;

    // Fetch all meetings with cost data
    const { data: meetings } = await supabase
      .from("meetings")
      .select("duration_seconds, cost_breakdown, created_at")
      .order("created_at", { ascending: false });

    // Fetch profile for subscription info
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "subscription_tier, subscription_status, current_period_end",
      )
      .eq("user_id", user.id)
      .single();
    const isSubscriber =
      profile?.subscription_status === "active" ||
      profile?.subscription_status === "trialing";
    const activePlan = planForTier(
      pricing,
      isSubscriber ? (profile?.subscription_tier as string | null) : "free",
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalMeetings = 0;
    let thisMonthMeetings = 0;
    let totalMinutes = 0;
    let thisMonthMinutes = 0;
    let totalSttCost = 0;
    let thisMonthSttCost = 0;
    let totalLlmCost = 0;
    let thisMonthLlmCost = 0;
    let totalTokens = 0;

    for (const m of meetings ?? []) {
      totalMeetings++;
      const isThisMonth = new Date(m.created_at) >= monthStart;
      if (isThisMonth) thisMonthMeetings++;

      const duration = (m.duration_seconds ?? 0) / 60;
      totalMinutes += duration;
      if (isThisMonth) thisMonthMinutes += duration;

      const cost = m.cost_breakdown as MeetingCostBreakdown | null;
      if (cost) {
        totalSttCost += cost.stt.totalCostUsd;
        totalLlmCost += cost.llm.totalCostUsd;
        totalTokens +=
          cost.llm.totalInputTokens + cost.llm.totalOutputTokens;
        if (isThisMonth) {
          thisMonthSttCost += cost.stt.totalCostUsd;
          thisMonthLlmCost += cost.llm.totalCostUsd;
        }
      }
    }

    const meetingLimit = activePlan.meetingLimit ?? null;
    const meetingLimitPeriod = activePlan.meetingLimitPeriod ?? "monthly";
    const freeRemaining = quotaBypass
      ? Infinity
      : Math.max(0, freeLimit - totalMeetings);
    const minuteLimit = quotaBypass ? null : activePlan.monthlyMinuteLimit ?? null;
    const monthlyRemaining =
      minuteLimit === null ? null : Math.max(0, minuteLimit - Math.round(thisMonthMinutes));

    return {
      quotaBypass,
      meetings: {
        total: totalMeetings,
        thisMonth: thisMonthMeetings,
        freeLimit: quotaBypass ? Infinity : freeLimit,
        freeRemaining,
        activePlanId: quotaBypass ? "bypass-unlimited" : activePlan.id,
        meetingLimit: quotaBypass ? null : meetingLimit,
        meetingLimitPeriod,
      },
      minutes: {
        total: Math.round(totalMinutes),
        thisMonth: Math.round(thisMonthMinutes),
        monthlyLimit: minuteLimit,
        monthlyRemaining,
      },
      stt: {
        totalCostUsd: totalSttCost,
        thisMonthCostUsd: thisMonthSttCost,
      },
      llm: {
        totalCostUsd: totalLlmCost,
        thisMonthCostUsd: thisMonthLlmCost,
        totalTokens,
        source: "local",
      },
      subscription: {
        tier: (profile?.subscription_tier as "core" | "pro" | null) ?? null,
        status: profile?.subscription_status ?? null,
        currentPeriodEnd: profile?.current_period_end ?? null,
      },
    };
  } catch (err) {
    console.warn("[usage] Error computing usage summary:", err);
    return empty;
  }
}
