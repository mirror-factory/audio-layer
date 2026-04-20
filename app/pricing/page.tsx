"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    price: "$15",
    period: "/month",
    features: [
      "Unlimited meetings",
      "All Free features",
      "Priority processing",
      "Full model selection",
    ],
    cta: "Subscribe",
    tier: "core" as const,
    highlight: true,
  },
  {
    name: "Pro",
    price: "$25",
    period: "/month",
    features: [
      "Unlimited meetings",
      "All Core features",
      "Priority support",
      "Future premium features",
    ],
    cta: "Subscribe",
    tier: "pro" as const,
    highlight: false,
  },
];

export default function PricingPage() {
  const router = useRouter();
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
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar title="Pricing" showBack />

      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-[#f5f5f5] mb-2">
            Simple, transparent pricing
          </h2>
          <p className="text-sm text-[#a3a3a3]">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`bg-[#171717] rounded-xl p-5 flex flex-col ${
                tier.highlight
                  ? "border-2 border-[#14b8a6] ring-1 ring-[#14b8a6]/20"
                  : "border border-[#262626]"
              }`}
            >
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-[#e5e5e5]">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-semibold text-[#f5f5f5]">
                    {tier.price}
                  </span>
                  <span className="text-xs text-[#525252]">{tier.period}</span>
                </div>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check
                      size={14}
                      className="text-[#14b8a6] shrink-0 mt-0.5"
                    />
                    <span className="text-[#a3a3a3]">{f}</span>
                  </li>
                ))}
              </ul>

              {tier.cta && tier.tier && (
                <button
                  onClick={() => handleCheckout(tier.tier!)}
                  disabled={loadingTier !== null}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors duration-200 ${
                    tier.highlight
                      ? "bg-[#14b8a6] hover:bg-[#0d9488] text-white"
                      : "bg-[#262626] hover:bg-[#404040] text-[#d4d4d4]"
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
                <div className="text-center text-xs text-[#525252] py-2.5">
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
