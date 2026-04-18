/**
 * /usage — lifetime + this-month usage and spend.
 *
 * Server-rendered from lib/billing/usage.ts::getUsageSummary().
 * Data sources:
 *   - STT cost       → local aggregation of meetings.cost_breakdown
 *   - LLM cost       → local aggregation, with Langfuse overlay when
 *                       the keys are configured and it reports traces
 *   - Minutes + count → meetings table
 *   - Subscription   → profiles table
 */

import Link from "next/link";
import { formatUsd } from "@/lib/billing/llm-pricing";
import { getUsageSummary } from "@/lib/billing/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const usage = await getUsageSummary();
  const subActive =
    usage.subscription.status === "active" ||
    usage.subscription.status === "trialing";
  const tierLabel = usage.subscription.tier
    ? `${usage.subscription.tier.toUpperCase()} · ${usage.subscription.status ?? "unknown"}`
    : "Free";

  return (
    <main className="min-h-dvh bg-neutral-950 px-4 pb-20 pt-4 md:px-6 md:pt-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-200">Usage</h1>
            <p className="text-xs text-neutral-500">
              Lifetime + this-month totals for meetings, transcription
              minutes, STT spend, and LLM spend.
              {usage.llm.source === "langfuse"
                ? " LLM numbers come from Langfuse."
                : usage.llm.source === "local"
                  ? " LLM numbers come from locally-stored cost breakdowns."
                  : " LLM numbers unavailable."}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/pricing"
              className="min-h-[44px] flex items-center rounded-md border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-emerald-200 hover:bg-emerald-900/50"
            >
              {subActive ? "Manage plan" : "Upgrade"}
            </Link>
            <Link
              href="/meetings"
              className="min-h-[44px] flex items-center text-neutral-500 hover:text-neutral-300"
            >
              All meetings
            </Link>
            <Link href="/" className="min-h-[44px] flex items-center text-neutral-500 hover:text-neutral-300">
              ← Hub
            </Link>
          </div>
        </header>

        <section
          aria-label="Headline totals"
          className="grid grid-cols-2 gap-3 md:grid-cols-4"
        >
          <Tile
            label="Meetings"
            value={String(usage.meetings.total)}
            sub={`${usage.meetings.thisMonth} this month`}
            tail={
              subActive
                ? `Plan: ${tierLabel}`
                : `${Math.max(0, usage.meetings.freeRemaining)} of ${usage.meetings.freeLimit} free left`
            }
          />
          <Tile
            label="Minutes"
            value={formatMinutes(usage.minutes.total)}
            sub={`${formatMinutes(usage.minutes.thisMonth)} this month`}
          />
          <Tile
            label="STT spend"
            value={formatUsd(usage.stt.totalCostUsd)}
            sub={`${formatUsd(usage.stt.thisMonthCostUsd)} this month`}
            tail="AssemblyAI Universal-3 Pro"
          />
          <Tile
            label="LLM spend"
            value={formatUsd(usage.llm.totalCostUsd)}
            sub={`${formatUsd(usage.llm.thisMonthCostUsd)} this month`}
            tail={`${usage.llm.totalTokens.toLocaleString()} tokens · ${usage.llm.source}`}
          />
        </section>

        <section
          aria-label="Subscription"
          className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4"
        >
          <header className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-neutral-200">
              Subscription
            </h2>
            <span className="text-xs text-neutral-500">{tierLabel}</span>
          </header>
          <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <Field label="Plan" value={usage.subscription.tier ?? "free"} />
            <Field
              label="Status"
              value={usage.subscription.status ?? "—"}
            />
            <Field
              label="Renews"
              value={
                usage.subscription.currentPeriodEnd
                  ? new Date(
                      usage.subscription.currentPeriodEnd,
                    ).toLocaleString()
                  : "—"
              }
            />
          </dl>
        </section>

        {usage.llm.source === "unavailable" ? (
          <p className="text-[11px] text-neutral-500">
            Usage numbers aren&apos;t available. Most likely Supabase isn&apos;t
            configured in this environment — persisted cost data requires{" "}
            <code className="rounded bg-neutral-800 px-1 text-[10px]">
              SUPABASE_URL
            </code>{" "}
            and a signed-in session.
          </p>
        ) : null}
      </div>
    </main>
  );
}

function formatMinutes(mins: number): string {
  if (!Number.isFinite(mins) || mins <= 0) return "0m";
  if (mins < 60) return `${mins.toFixed(1)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

function Tile({
  label,
  value,
  sub,
  tail,
}: {
  label: string;
  value: string;
  sub: string;
  tail?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <p className="text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl text-neutral-100">{value}</p>
      <p className="mt-0.5 text-xs text-neutral-300">{sub}</p>
      {tail ? (
        <p className="mt-0.5 text-[11px] text-neutral-500">{tail}</p>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd className="mt-0.5 break-all text-neutral-200">{value}</dd>
    </div>
  );
}
