/**
 * /pricing — static landing page with two paid tiers.
 *
 * Pricing is locked in the product brief (Core $15, Pro $25).
 * The Subscribe buttons hit POST /api/stripe/checkout and redirect
 * to the Stripe-hosted session URL. When STRIPE_SECRET_KEY isn't
 * set the route returns 503 — the client surfaces a helpful note.
 */

import Link from "next/link";
import { PricingButtons } from "./pricing-buttons";

const TIERS = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    period: "",
    cta: null,
    blurb: "25 lifetime meetings. Try the full Universal-3 Pro pipeline.",
    features: [
      "25 free meetings (no credit card)",
      "AssemblyAI Universal-3 Pro transcription",
      "AI summary + intake extraction",
      "Markdown export",
      "Live captions (/record/live)",
    ],
  },
  {
    id: "core" as const,
    name: "Core",
    price: "$15",
    period: "/month",
    cta: "Subscribe",
    blurb: "For individuals and light meeting volume.",
    features: [
      "600 minutes / month (~10 hrs)",
      "Up to 8 speakers identified",
      "90-day transcript history",
      "All export formats",
      "Email support",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$25",
    period: "/month",
    cta: "Subscribe",
    blurb: "For power users in 10+ meetings per week.",
    features: [
      "Unlimited minutes (1,500 fair-use)",
      "Unlimited speakers",
      "Unlimited transcript history",
      "Cross-meeting AI search",
      "CRM / Notion / Slack integrations",
      "Custom vocabulary (1,000 keyterms)",
      "Priority support",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-dvh bg-neutral-950 px-4 py-10 md:px-6 md:py-16">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-400/80">
            Pricing
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-100 md:text-4xl">
            Best-in-class transcription. Fair monthly pricing.
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-neutral-400">
            Powered by AssemblyAI Universal-3 Pro — the highest-accuracy
            real-world speech-to-text model as of April 2026. No bot in the
            meeting. Audio never stored.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {TIERS.map((tier) => (
            <article
              key={tier.id}
              className={`flex flex-col gap-4 rounded-2xl border bg-neutral-900/50 p-6 ${
                tier.id === "pro"
                  ? "border-emerald-700/60 shadow-[0_24px_60px_rgba(16,185,129,0.15)]"
                  : "border-neutral-800"
              }`}
            >
              <div>
                <h2 className="text-lg font-semibold text-neutral-100">
                  {tier.name}
                </h2>
                <p className="mt-1 text-xs text-neutral-500">{tier.blurb}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-neutral-100">
                  {tier.price}
                </span>
                <span className="text-sm text-neutral-500">{tier.period}</span>
              </div>
              <ul className="space-y-1.5 text-sm text-neutral-300">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span aria-hidden className="text-emerald-400">
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-2">
                {tier.cta ? (
                  <PricingButtons tier={tier.id} label={tier.cta} />
                ) : (
                  <Link
                    href="/record"
                    className="block w-full rounded-md border border-neutral-700 px-4 py-2 text-center text-sm font-medium text-neutral-200 hover:bg-neutral-800"
                  >
                    Start recording
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>

        <footer className="text-center text-xs text-neutral-500">
          <Link href="/" className="hover:text-neutral-300">
            ← Back to hub
          </Link>
        </footer>
      </div>
    </div>
  );
}
