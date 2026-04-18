/**
 * Usage aggregator — powers the /usage page and the per-meeting panel.
 *
 * Strategy (Option C from the planning discussion):
 *   1. Always aggregate STT + LLM cost from our own persisted
 *      `meetings.cost_breakdown` column. This is the source of truth
 *      for spend and is available regardless of Langfuse health.
 *   2. When Langfuse is configured, query its daily-metrics API and
 *      overlay the authoritative LLM totals it reports. If its values
 *      are meaningfully higher than ours (it sees traces from every
 *      environment), we trust Langfuse; otherwise we stick with local.
 *   3. Subscription state comes from the `profiles` table.
 *
 * Fail-open: any partial failure degrades gracefully — the page
 * always renders with whatever data we could collect.
 */

import { getSupabaseUser, getCurrentUserId } from "@/lib/supabase/user";
import {
  fetchLangfuseDailyMetrics,
  isLangfuseConfigured,
  startOfMonthIso,
  type LangfuseMetricsSummary,
} from "@/lib/observability/langfuse-api";
import { FREE_TIER_MEETING_LIMIT } from "./quota";
import type { MeetingCostBreakdown, UsageSummary } from "./types";

interface MeetingRowForCost {
  duration_seconds: number | null;
  cost_breakdown: MeetingCostBreakdown | null;
  created_at: string;
}

interface ProfileRowForUsage {
  subscription_status: string | null;
  subscription_tier: "core" | "pro" | null;
  current_period_end: string | null;
}

function isThisMonth(iso: string, monthStart: Date): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= monthStart.getTime();
}

function summarizeLocalMeetings(
  rows: MeetingRowForCost[],
  monthStart: Date,
): {
  meetings: number;
  meetingsThisMonth: number;
  minutes: number;
  minutesThisMonth: number;
  sttCost: number;
  sttCostThisMonth: number;
  llmCost: number;
  llmCostThisMonth: number;
  llmTokens: number;
} {
  let meetings = 0;
  let meetingsThisMonth = 0;
  let minutes = 0;
  let minutesThisMonth = 0;
  let sttCost = 0;
  let sttCostThisMonth = 0;
  let llmCost = 0;
  let llmCostThisMonth = 0;
  let llmTokens = 0;

  for (const row of rows) {
    meetings += 1;
    const mins = (row.duration_seconds ?? 0) / 60;
    minutes += mins;
    const thisMonth = isThisMonth(row.created_at, monthStart);
    if (thisMonth) {
      meetingsThisMonth += 1;
      minutesThisMonth += mins;
    }
    const cb = row.cost_breakdown;
    if (cb) {
      sttCost += cb.stt?.totalCostUsd ?? 0;
      llmCost += cb.llm?.totalCostUsd ?? 0;
      llmTokens +=
        (cb.llm?.totalInputTokens ?? 0) + (cb.llm?.totalOutputTokens ?? 0);
      if (thisMonth) {
        sttCostThisMonth += cb.stt?.totalCostUsd ?? 0;
        llmCostThisMonth += cb.llm?.totalCostUsd ?? 0;
      }
    }
  }

  return {
    meetings,
    meetingsThisMonth,
    minutes,
    minutesThisMonth,
    sttCost,
    sttCostThisMonth,
    llmCost,
    llmCostThisMonth,
    llmTokens,
  };
}

function emptyUsageSummary(): UsageSummary {
  return {
    meetings: {
      total: 0,
      thisMonth: 0,
      freeLimit: FREE_TIER_MEETING_LIMIT,
      freeRemaining: FREE_TIER_MEETING_LIMIT,
    },
    minutes: { total: 0, thisMonth: 0 },
    stt: { totalCostUsd: 0, thisMonthCostUsd: 0 },
    llm: {
      totalCostUsd: 0,
      thisMonthCostUsd: 0,
      totalTokens: 0,
      source: "unavailable",
    },
    subscription: { tier: null, status: null, currentPeriodEnd: null },
  };
}

export async function getUsageSummary(): Promise<UsageSummary> {
  const supabase = await getSupabaseUser();
  if (!supabase) return emptyUsageSummary();

  const userId = await getCurrentUserId();
  if (!userId) return emptyUsageSummary();

  const monthStart = new Date(startOfMonthIso());

  // 1. Pull every meeting's cost info. RLS scopes this automatically.
  const meetingsRes = await supabase
    .from("meetings")
    .select("duration_seconds,cost_breakdown,created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  const meetingsData = (meetingsRes.data ?? []) as MeetingRowForCost[];
  const local = summarizeLocalMeetings(meetingsData, monthStart);

  // 2. Active subscription bypasses the free cap.
  const profileRes = await supabase
    .from("profiles")
    .select("subscription_status,subscription_tier,current_period_end")
    .eq("user_id", userId)
    .maybeSingle<ProfileRowForUsage>();
  const profile = profileRes.data ?? null;
  const hasActiveSub =
    profile?.subscription_status === "active" ||
    profile?.subscription_status === "trialing";

  // 3. Optionally overlay Langfuse (authoritative LLM cost across envs).
  let llmSource: UsageSummary["llm"]["source"] = "local";
  let llmTotalCost = local.llmCost;
  let llmMonthCost = local.llmCostThisMonth;
  let llmTokens = local.llmTokens;
  if (isLangfuseConfigured()) {
    try {
      const [allTime, thisMonth] = await Promise.all([
        fetchLangfuseDailyMetrics({ userId, limit: 365 }),
        fetchLangfuseDailyMetrics({
          userId,
          fromTimestamp: monthStart.toISOString(),
          limit: 62,
        }),
      ]);
      // Trust Langfuse only if it actually reports traces for this
      // user. If it returns zeros (misconfigured OTEL, missing user_id
      // propagation), fall back to our locally-computed numbers.
      if ((allTime?.traceCount ?? 0) > 0) {
        llmSource = "langfuse";
        llmTotalCost = allTime!.totalCostUsd;
        llmTokens = allTime!.totalTokens;
        if (thisMonth) llmMonthCost = thisMonth.totalCostUsd;
      }
    } catch (err) {
      // Log and fall back to local numbers — never block the page.
      console.error("[usage] Langfuse fetch failed", err);
    }
  }

  return {
    meetings: {
      total: local.meetings,
      thisMonth: local.meetingsThisMonth,
      freeLimit: FREE_TIER_MEETING_LIMIT,
      freeRemaining: hasActiveSub
        ? Number.POSITIVE_INFINITY
        : Math.max(0, FREE_TIER_MEETING_LIMIT - local.meetings),
    },
    minutes: {
      total: local.minutes,
      thisMonth: local.minutesThisMonth,
    },
    stt: {
      totalCostUsd: local.sttCost,
      thisMonthCostUsd: local.sttCostThisMonth,
    },
    llm: {
      totalCostUsd: llmTotalCost,
      thisMonthCostUsd: llmMonthCost,
      totalTokens: llmTokens,
      source: llmSource,
    },
    subscription: {
      tier: profile?.subscription_tier ?? null,
      status: profile?.subscription_status ?? null,
      currentPeriodEnd: profile?.current_period_end ?? null,
    },
  };
}

/** Export the local-only variant for unit tests. */
export function __summarizeLocalMeetingsForTest(
  rows: MeetingRowForCost[],
  monthStart: Date,
) {
  return summarizeLocalMeetings(rows, monthStart);
}

export type { LangfuseMetricsSummary };
