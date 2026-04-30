"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { TopBar } from "@/components/top-bar";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "25 meetings lifetime",
      "Batch + live transcription",
      "AI summary & intake extraction",
      "Cost transparency",
    ],
    cta: null,
    tier: null,
    highlight: false,
  },
  {
    name: "Core",
    price: "$20",
    period: "/month",
    features: [
      "Unlimited meetings",
      "600 transcription minutes included",
      "Enhanced speech-to-text",
      "AI summaries, decisions, and actions",
    ],
    cta: "Subscribe",
    tier: "core" as const,
    highlight: true,
  },
  {
    name: "Pro",
    price: "$30",
    period: "/month",
    features: [
      "1,500 transcription minutes included",
      "Everything in Core",
      "Advanced model routing",
      "Priority support",
    ],
    cta: "Subscribe",
    tier: "pro" as const,
    highlight: false,
  },
];

export default function PricingPage() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (tier: "core" | "pro") => {
    setLoadingTier(tier);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Checkout failed");
      }

      const { url } = await res.json();
      if (url) {
        globalThis.location.assign(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoadingTier(null);
    }
  };

  return (
    <div className="paper-calm-page min-h-screen-safe flex flex-col bg-[var(--bg-primary)]">
      <TopBar title="Pricing" showBack />

      <main className="flex-1 px-4 pb-safe py-8 max-w-4xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Simple, transparent pricing
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`glass-card rounded-2xl p-6 flex flex-col transition-all duration-300 ${
                tier.highlight
                  ? "border-[#14b8a6] ring-1 ring-[#14b8a6]/20 shadow-lg shadow-[#14b8a6]/5"
                  : ""
              }`}
            >
              <div className="mb-5">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-semibold text-[var(--text-primary)]">
                    {tier.price}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{tier.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check
                      size={14}
                      className="text-[#14b8a6] shrink-0 mt-0.5"
                    />
                    <span className="text-[var(--text-secondary)]">{f}</span>
                  </li>
                ))}
              </ul>

              {tier.cta && tier.tier && (
                <button
                  onClick={() => handleCheckout(tier.tier!)}
                  disabled={loadingTier !== null}
                  className={`w-full py-3 rounded-xl text-sm font-medium min-h-[44px] transition-all duration-200 ${
                    tier.highlight
                      ? "bg-[#14b8a6] hover:bg-[#0d9488] text-white shadow-lg shadow-[#14b8a6]/20"
                      : "bg-white/[0.05] hover:bg-white/[0.08] text-[var(--text-primary)] border border-white/[0.08]"
                  } disabled:opacity-50`}
                >
                  {loadingTier === tier.tier ? (
                    <Loader2 size={16} className="animate-spin mx-auto" />
                  ) : (
                    tier.cta
                  )}
                </button>
              )}

              {!tier.cta && (
                <div className="text-center text-xs text-[var(--text-muted)] py-3">
                  Current plan
                </div>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-[#ef4444] text-center mt-4">{error}</p>
        )}
      </main>
    </div>
  );
}
