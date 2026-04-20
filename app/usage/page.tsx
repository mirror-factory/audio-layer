import { TopBar } from "@/components/top-bar";
import { getUsageSummary } from "@/lib/billing/usage";

export const dynamic = "force-dynamic";

function formatUsd(amount: number): string {
  if (amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

export default async function UsagePage() {
  const usage = await getUsageSummary();

  const tiles = [
    {
      label: "Total Meetings",
      value: usage.meetings.total.toString(),
      sub: `${usage.meetings.thisMonth} this month`,
      accent: false,
    },
    {
      label: "Minutes Transcribed",
      value: usage.minutes.total.toString(),
      sub: `${usage.minutes.thisMonth} this month`,
      accent: false,
    },
    {
      label: "STT Spend",
      value: formatUsd(usage.stt.totalCostUsd),
      sub: `${formatUsd(usage.stt.thisMonthCostUsd)} this month`,
      accent: true,
    },
    {
      label: "LLM Spend",
      value: formatUsd(usage.llm.totalCostUsd),
      sub: `${formatUsd(usage.llm.thisMonthCostUsd)} this month`,
      accent: true,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar title="Usage" showBack />

      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full space-y-6">
        <h2 className="text-lg font-semibold text-[#e5e5e5]">Cost Tracking</h2>

        {/* Usage Tiles */}
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="bg-[#171717] rounded-xl p-4"
            >
              <div className="text-xs text-[#737373] uppercase tracking-wider mb-1">
                {tile.label}
              </div>
              <div
                className={`text-xl font-semibold ${
                  tile.accent ? "text-[#14b8a6]" : "text-[#e5e5e5]"
                }`}
              >
                {tile.value}
              </div>
              <div className="text-xs text-[#525252] mt-0.5">{tile.sub}</div>
            </div>
          ))}
        </div>

        {/* Subscription Status */}
        <div className="bg-[#171717] rounded-xl p-4">
          <div className="text-xs text-[#737373] uppercase tracking-wider mb-2">
            Subscription
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#e5e5e5] font-medium">
              {usage.subscription.tier
                ? usage.subscription.tier.charAt(0).toUpperCase() +
                  usage.subscription.tier.slice(1)
                : "Free"}
            </span>
            {usage.subscription.status && (
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  usage.subscription.status === "active"
                    ? "bg-[#22c55e]/10 text-[#22c55e]"
                    : "bg-[#eab308]/10 text-[#eab308]"
                }`}
              >
                {usage.subscription.status}
              </span>
            )}
          </div>
          {usage.subscription.currentPeriodEnd && (
            <div className="text-xs text-[#525252] mt-1">
              Renews{" "}
              {new Date(usage.subscription.currentPeriodEnd).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Free tier quota */}
        {!usage.subscription.tier && (
          <div className="bg-[#171717] rounded-xl p-4">
            <div className="text-xs text-[#737373] uppercase tracking-wider mb-2">
              Free Tier Quota
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#a3a3a3]">
                {usage.meetings.total} / {usage.meetings.freeLimit} meetings used
              </span>
              <span className="text-xs text-[#525252]">
                {usage.meetings.freeRemaining} remaining
              </span>
            </div>
            <div className="h-2 bg-[#262626] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#14b8a6] rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (usage.meetings.total / usage.meetings.freeLimit) * 100,
                    100,
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
