"use client";

/**
 * Pricing — "Paper Calm" editorial layout.
 *
 * Design approach:
 * - Asymmetric tier display: Core is the visual anchor (wider, elevated, mint).
 *   Free and Pro flank it as quieter paper surfaces (violet/blue soft tints).
 *   Avoids the three-identical-cards Stripe trap.
 * - Editorial typography moment: prices set in a generous fluid clamp, with the
 *   currency/period treated as small caps marginalia. Italic for a hand-set feel.
 * - "What you get at each tier" reads as a typographic ledger, not a dense matrix.
 * - FAQ is set as Q/A blocks with hairline rules, no accordion theatrics.
 *
 * Tokens I wished existed (for `app/styles/tokens.css`):
 * - `--space-fluid-section`: clamp(48px, 6vw, 96px) — section rhythm without manual clamps.
 * - `--paper-grain`: a reusable radial-gradient noise mix to apply to surfaces.
 * - `--text-display-md`: a smaller editorial display step (~clamp(2.6rem, 4.4vw, 4rem)).
 * - `--shadow-paper`: `0 1px 0 var(--border-subtle), 0 24px 60px oklch(0.22 0.035 256 / 0.06)`.
 * - `--ring-mint`: focus ring tuned for mint-on-paper instead of redefining inline.
 *
 * NOTE: globals.css is owned by another agent, so this file styles inline using
 * existing CSS custom properties (no raw hex, OKLCH only via tokens).
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";

type PaidTierId = "core" | "pro";

type Tier = {
  name: string;
  price: string;
  period: string;
  pitch: string;
  included: string;
  cta: string;
  href?: string;
  tier: PaidTierId | null;
  highlight: boolean;
  accent: "mint" | "violet" | "blue";
  features: string[];
};

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever, no card",
    pitch: "Try the full meeting-memory workflow on a real launch account.",
    included: "25 meetings, lifetime",
    cta: "Coming soon",
    href: "/sign-up",
    tier: null,
    highlight: false,
    accent: "violet",
    features: [
      "Live and uploaded recordings",
      "Transcript, summary, actions, decisions",
      "Search across your meeting library",
      "Transparent usage view",
    ],
  },
  {
    name: "Core",
    price: "$20",
    period: "per user · monthly",
    pitch: "For founders and operators who use Layers every week.",
    included: "Unlimited meetings · 600 transcription minutes",
    cta: "Coming soon",
    tier: "core",
    highlight: true,
    accent: "mint",
    features: [
      "Enhanced speech-to-text",
      "AI summaries, decisions, actions, intake",
      "Calendar context",
      "AI tool-ready meeting memory",
      "Priority email support",
    ],
  },
  {
    name: "Pro",
    price: "$30",
    period: "per user · monthly",
    pitch: "For teams that want richer context and stronger controls.",
    included: "Everything in Core · 1,500 minutes",
    cta: "Coming soon",
    tier: "pro",
    highlight: false,
    accent: "blue",
    features: [
      "Advanced model routing",
      "Team library and sharing",
      "Admin controls",
      "Priority support",
    ],
  },
];

const ACCENT: Record<Tier["accent"], { tint: string; soft: string; ink: string }> = {
  mint: {
    tint: "var(--layers-mint-tint)",
    soft: "var(--layers-mint-soft)",
    ink: "var(--tier-mint-text)",
  },
  violet: {
    tint: "var(--layers-violet-tint)",
    soft: "var(--layers-violet-soft)",
    ink: "var(--tier-violet-text)",
  },
  blue: {
    tint: "var(--layers-blue-tint)",
    soft: "var(--layers-blue-soft)",
    ink: "var(--tier-blue-text)",
  },
};

const LEDGER: Array<{ label: string; free: string; core: string; pro: string }> = [
  {
    label: "Meetings captured",
    free: "25, lifetime",
    core: "Unlimited",
    pro: "Unlimited",
  },
  {
    label: "Transcription minutes",
    free: "Trial pool",
    core: "600 / mo",
    pro: "1,500 / mo",
  },
  {
    label: "AI outputs",
    free: "Summary, actions, decisions",
    core: "Enhanced outputs",
    pro: "Enhanced outputs",
  },
  {
    label: "Workspace",
    free: "Personal",
    core: "Personal",
    pro: "Team-ready",
  },
  {
    label: "Support",
    free: "Community",
    core: "Priority email",
    pro: "Priority + onboarding",
  },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Subscriptions are month-to-month and you can cancel from your billing portal. You keep access until the end of the current period.",
  },
  {
    q: "What's the real difference between Core and Pro?",
    a: "Core gives you unlimited meetings and 600 transcription minutes for one person. Pro adds 1,500 minutes, advanced model routing, team sharing, and admin controls — useful once more than one teammate is relying on Layers.",
  },
  {
    q: "Is my meeting data private?",
    a: "Recordings, transcripts, and AI outputs live in your workspace. We don't train models on your content, and you can delete anything from the dashboard at any time.",
  },
  {
    q: "What happens if I run out of transcription minutes?",
    a: "Layers keeps usage visible all month, warns before you hit the cap, and lets you top up or upgrade without losing context. Nothing surprises you on the invoice.",
  },
  {
    q: "Do you offer team or annual billing?",
    a: "Pro is built around small teams today. For larger rollouts or annual contracts, reach out from the dashboard and we'll sort it out personally.",
  },
];

export default function PricingPage() {
  const [loadingTier, setLoadingTier] = useState<PaidTierId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (tier: PaidTierId) => {
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
    <div
      className="pricing-public-page min-h-screen-safe"
      style={{
        // Page rhythm — fluid section spacing without touching tokens.css.
        ["--section-y" as string]: "clamp(56px, 7vw, 112px)",
        ["--gutter" as string]: "clamp(20px, 4vw, 56px)",
        paddingBottom: "var(--section-y)",
      }}
    >
      <Hero />
      <Tiers tiers={TIERS} loadingTier={loadingTier} onCheckout={handleCheckout} />

      {/* Responsive overrides — keep desktop layout untouched, fix mobile + tablet. */}
      <style jsx global>{`
        /* Tablet — comfortable two-column or single column ledger row. */
        @media (max-width: 960px) {
          .pricing-hero-wrap {
            grid-template-columns: minmax(0, 1fr) !important;
            align-items: start !important;
            row-gap: var(--space-5) !important;
          }
          .pricing-ledger-wrap,
          .pricing-faq-wrap {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .pricing-final-cta {
            grid-template-columns: minmax(0, 1fr) !important;
            row-gap: var(--space-6) !important;
          }
          .pricing-tiers-row {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
            row-gap: 28px !important;
          }
          /* Featured anchor spans full width above the row at tablet. */
          .pricing-tiers-row > article.tier-featured {
            grid-column: 1 / -1 !important;
            transform: none !important;
          }
        }

        /* Mobile — single column stack, Core anchored on top. */
        @media (max-width: 640px) {
          .pricing-tiers-row {
            grid-template-columns: minmax(0, 1fr) !important;
            row-gap: 20px !important;
          }
          .pricing-tiers-row > article {
            transform: none !important;
          }
          /* Order: Core (anchor) first, then Free, then Pro on small screens. */
          .pricing-tiers-row > article.tier-featured {
            order: -1;
          }
          /* Comparison ledger — let it scroll horizontally with a soft fade hint. */
          .pricing-ledger-table-scroll {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            margin-inline: calc(var(--gutter) * -0.25);
            padding-inline: calc(var(--gutter) * 0.25);
            mask-image: linear-gradient(
              to right,
              black 0,
              black calc(100% - 28px),
              transparent 100%
            );
          }
          .pricing-ledger-table-scroll > [role="table"] {
            min-width: 520px;
          }
        }
      `}</style>

      {error ? (
        <p
          role="alert"
          style={{
            margin: "var(--space-6) auto 0",
            maxWidth: "min(100% - 40px, 720px)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            background: "color-mix(in oklch, var(--signal-live) 10%, transparent)",
            color: "var(--signal-live)",
            fontSize: "var(--text-sm)",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      ) : null}

      <Ledger />
      <Faq />
      <FinalCta />
    </div>
  );
}

function Hero() {
  return (
    <section
      aria-labelledby="pricing-title"
      style={{
        width: "min(100% - 40px, 1180px)",
        margin: "0 auto",
        paddingTop: "var(--section-y)",
        paddingBottom: "clamp(32px, 4vw, 64px)",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
        gap: "var(--gutter)",
        alignItems: "end",
      }}
      className="pricing-hero-wrap"
    >
      <div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "6px 12px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--border-subtle)",
            background: "color-mix(in oklch, var(--bg-surface) 86%, transparent)",
            color: "var(--fg-muted)",
            fontSize: "var(--text-xs)",
            letterSpacing: "var(--tracking-uppercase)",
            textTransform: "uppercase",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: "var(--radius-pill)",
              background: "var(--layers-mint)",
            }}
          />
          AI memory for your meetings
        </span>
        <h1
          id="pricing-title"
          style={{
            marginTop: "var(--space-5)",
            color: "var(--layers-ink)",
            fontWeight: 600,
            fontSize: "clamp(2.6rem, 5.2vw, 4.4rem)",
            lineHeight: 1.04,
            letterSpacing: "-0.022em",
            maxWidth: "16ch",
          }}
        >
          Pay for the meeting memory{" "}
          <em
            style={{
              fontStyle: "italic",
              fontWeight: 500,
              color: "var(--layers-mint)",
            }}
          >
            you actually use.
          </em>
        </h1>
      </div>

      <p
        style={{
          color: "var(--fg-muted)",
          fontSize: "clamp(1rem, 1.1vw, 1.125rem)",
          lineHeight: 1.6,
          maxWidth: "44ch",
          marginBottom: "var(--space-2)",
        }}
      >
        Start with twenty-five free meetings. Upgrade when Layers becomes the
        place your team goes for decisions, actions, and AI-ready meeting
        context — not before.
      </p>
    </section>
  );
}

function Tiers({
  tiers,
  loadingTier,
  onCheckout,
}: {
  tiers: Tier[];
  loadingTier: PaidTierId | null;
  onCheckout: (tier: PaidTierId) => void;
}) {
  return (
    <section
      aria-label="Plans"
      style={{
        width: "min(100% - 40px, 1180px)",
        margin: "0 auto",
        // Asymmetric: Free / Core (anchor) / Pro — middle column wider.
        display: "grid",
        gridTemplateColumns:
          "minmax(0, 0.9fr) minmax(0, 1.25fr) minmax(0, 0.9fr)",
        gap: "clamp(16px, 1.6vw, 28px)",
        alignItems: "stretch",
      }}
      className="pricing-tiers-row"
    >
      {tiers.map((tier) => (
        <TierCard
          key={tier.name}
          tier={tier}
          loadingTier={loadingTier}
          onCheckout={onCheckout}
        />
      ))}
    </section>
  );
}

function TierCard({
  tier,
  loadingTier,
  onCheckout,
}: {
  tier: Tier;
  loadingTier: PaidTierId | null;
  onCheckout: (tier: PaidTierId) => void;
}) {
  const accent = ACCENT[tier.accent];
  const isFeatured = tier.highlight;
  const isBusy = tier.tier !== null && loadingTier === tier.tier;
  const anyBusy = loadingTier !== null;

  return (
    <article
      aria-labelledby={`tier-${tier.name.toLowerCase()}`}
      className={isFeatured ? "tier-featured" : undefined}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        padding: isFeatured
          ? "clamp(28px, 3vw, 44px)"
          : "clamp(22px, 2.4vw, 32px)",
        borderRadius: "var(--radius-2xl)",
        // Featured: confident mint surface with paper-grain. Others: paper.
        background: isFeatured
          ? `radial-gradient(circle at 88% 0%, color-mix(in oklch, ${accent.soft} 45%, transparent), transparent 62%), radial-gradient(circle at 8% 100%, color-mix(in oklch, ${accent.tint} 80%, transparent), transparent 50%), var(--bg-surface)`
          : `radial-gradient(circle at 100% 0%, color-mix(in oklch, ${accent.tint} 55%, transparent), transparent 60%), var(--bg-surface)`,
        border: `1px solid ${
          isFeatured
            ? `color-mix(in oklch, ${accent.soft} 60%, var(--border-default))`
            : "var(--border-default)"
        }`,
        boxShadow: isFeatured
          ? "0 1px 0 color-mix(in oklch, var(--bg-surface) 80%, white), 0 32px 80px oklch(0.22 0.035 256 / 0.10)"
          : "0 1px 0 color-mix(in oklch, var(--bg-surface) 80%, white), 0 14px 38px oklch(0.22 0.035 256 / 0.05)",
        // Featured nudges up slightly to anchor the row visually.
        transform: isFeatured ? "translateY(-12px)" : "none",
      }}
    >
      {isFeatured ? (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -12,
            left: "clamp(28px, 3vw, 44px)",
            padding: "4px 10px",
            borderRadius: "var(--radius-pill)",
            background: "var(--layers-ink)",
            color: "var(--bg-surface)",
            fontSize: "0.6875rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Most teams start here
        </span>
      ) : null}

      <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "var(--space-3)",
          }}
        >
          <h2
            id={`tier-${tier.name.toLowerCase()}`}
            style={{
              fontSize: "var(--text-md)",
              fontWeight: 600,
              color: "var(--layers-ink)",
              letterSpacing: "-0.005em",
              margin: 0,
            }}
          >
            {tier.name}
          </h2>
          <span
            style={{
              fontSize: "0.6875rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: accent.ink,
              fontWeight: 600,
            }}
          >
            {tier.name === "Free"
              ? "Trial"
              : tier.name === "Core"
                ? "Most popular"
                : "For teams"}
          </span>
        </div>

        <PricePill
          price={tier.price}
          period={tier.period}
          isFeatured={isFeatured}
        />

        <p
          style={{
            color: "var(--fg-muted)",
            fontSize: "var(--text-sm)",
            lineHeight: 1.55,
            margin: 0,
            maxWidth: "32ch",
          }}
        >
          {tier.pitch}
        </p>
      </header>

      <div
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-md)",
          background: `color-mix(in oklch, ${accent.tint} 80%, transparent)`,
          color: accent.ink,
          fontSize: "var(--text-xs)",
          fontWeight: 500,
          letterSpacing: "0.01em",
        }}
      >
        {tier.included}
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {tier.features.map((feature) => (
          <li
            key={feature}
            style={{
              display: "grid",
              gridTemplateColumns: "16px 1fr",
              gap: "var(--space-3)",
              alignItems: "baseline",
              fontSize: "var(--text-sm)",
              color: "var(--fg-default)",
              lineHeight: 1.5,
            }}
          >
            <span
              aria-hidden
              style={{
                color: accent.ink,
                fontWeight: 600,
                fontSize: "0.85rem",
                lineHeight: 1,
              }}
            >
              ·
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "auto" }}>
        {tier.tier ? (
          <button
            type="button"
            onClick={() => onCheckout(tier.tier as PaidTierId)}
            disabled={anyBusy}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              width: "100%",
              padding: "14px 18px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid transparent",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              letterSpacing: "0.005em",
              cursor: anyBusy ? "not-allowed" : "pointer",
              background: isFeatured ? "var(--layers-ink)" : "var(--bg-surface)",
              color: isFeatured ? "var(--bg-surface)" : "var(--layers-ink)",
              borderColor: isFeatured ? "var(--layers-ink)" : "var(--border-default)",
              transition:
                "transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)",
              opacity: anyBusy && !isBusy ? 0.55 : 1,
            }}
          >
            {isBusy ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : (
              <>
                {tier.cta}
                <ArrowRight size={15} aria-hidden />
              </>
            )}
          </button>
        ) : (
          <Link
            href={tier.href ?? "/sign-up"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              width: "100%",
              padding: "14px 18px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border-default)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              background: "var(--bg-surface)",
              color: "var(--layers-ink)",
              textDecoration: "none",
            }}
          >
            {tier.cta}
            <ArrowRight size={15} aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}

function PricePill({
  price,
  period,
  isFeatured,
}: {
  price: string;
  period: string;
  isFeatured: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "var(--space-3)",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: isFeatured
            ? "clamp(3rem, 5.6vw, 4.4rem)"
            : "clamp(2.4rem, 4vw, 3.2rem)",
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: "var(--layers-ink)",
          fontVariantNumeric: "tabular-nums lining-nums",
        }}
      >
        {price}
      </span>
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--fg-subtle)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          maxWidth: "16ch",
          fontWeight: 500,
        }}
      >
        {period}
      </span>
    </div>
  );
}

function Ledger() {
  return (
    <section
      aria-label="What you get at each tier"
      style={{
        width: "min(100% - 40px, 1180px)",
        margin: "var(--section-y) auto 0",
        display: "grid",
        gridTemplateColumns: "minmax(0, 0.7fr) minmax(0, 1.3fr)",
        gap: "var(--gutter)",
      }}
      className="pricing-ledger-wrap"
    >
      <header>
        <span
          style={{
            display: "inline-block",
            color: "var(--brand-accent-muted)",
            fontSize: "var(--text-xs)",
            letterSpacing: "var(--tracking-uppercase)",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          A quiet comparison
        </span>
        <h2
          style={{
            marginTop: "var(--space-3)",
            color: "var(--layers-ink)",
            fontSize: "clamp(1.75rem, 3.4vw, 2.6rem)",
            fontWeight: 600,
            letterSpacing: "-0.018em",
            lineHeight: 1.1,
          }}
        >
          What you get at each tier.
        </h2>
        <p
          style={{
            marginTop: "var(--space-4)",
            color: "var(--fg-muted)",
            fontSize: "var(--text-sm)",
            lineHeight: 1.6,
            maxWidth: "32ch",
          }}
        >
          No matrix of checkmarks. Read the row, pick the column that fits how
          you actually work.
        </p>
      </header>

      <div className="pricing-ledger-table-scroll">
      <div role="table" aria-label="Plan comparison">
        <div
          role="row"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) repeat(3, minmax(0, 1fr))",
            gap: "var(--space-4)",
            paddingBottom: "var(--space-3)",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          <span role="columnheader" style={headerStyle}>
            Capability
          </span>
          <span role="columnheader" style={headerStyle}>
            Free
          </span>
          <span
            role="columnheader"
            style={{ ...headerStyle, color: "var(--brand-accent-muted)" }}
          >
            Core
          </span>
          <span role="columnheader" style={headerStyle}>
            Pro
          </span>
        </div>

        {LEDGER.map((row, i) => (
          <div
            role="row"
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) repeat(3, minmax(0, 1fr))",
              gap: "var(--space-4)",
              padding: "var(--space-4) 0",
              borderBottom:
                i === LEDGER.length - 1
                  ? "none"
                  : "1px solid var(--border-subtle)",
              fontSize: "var(--text-sm)",
              alignItems: "baseline",
            }}
          >
            <span
              role="rowheader"
              style={{ color: "var(--fg-default)", fontWeight: 500 }}
            >
              {row.label}
            </span>
            <span role="cell" style={cellStyle}>
              {row.free}
            </span>
            <span
              role="cell"
              style={{ ...cellStyle, color: "var(--layers-ink)", fontWeight: 500 }}
            >
              {row.core}
            </span>
            <span role="cell" style={cellStyle}>
              {row.pro}
            </span>
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}

const headerStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--fg-subtle)",
  fontWeight: 600,
};

const cellStyle: React.CSSProperties = {
  color: "var(--fg-muted)",
  lineHeight: 1.5,
};

function Faq() {
  return (
    <section
      aria-label="Frequently asked questions"
      style={{
        width: "min(100% - 40px, 1180px)",
        margin: "var(--section-y) auto 0",
        display: "grid",
        gridTemplateColumns: "minmax(0, 0.7fr) minmax(0, 1.3fr)",
        gap: "var(--gutter)",
      }}
      className="pricing-faq-wrap"
    >
      <header>
        <span
          style={{
            display: "inline-block",
            color: "var(--brand-accent-muted)",
            fontSize: "var(--text-xs)",
            letterSpacing: "var(--tracking-uppercase)",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Common questions
        </span>
        <h2
          style={{
            marginTop: "var(--space-3)",
            color: "var(--layers-ink)",
            fontSize: "clamp(1.75rem, 3.4vw, 2.6rem)",
            fontWeight: 600,
            letterSpacing: "-0.018em",
            lineHeight: 1.1,
          }}
        >
          Things people ask before they upgrade.
        </h2>
      </header>

      <dl
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          margin: 0,
          padding: 0,
        }}
      >
        {FAQ.map((item, i) => (
          <div
            key={item.q}
            style={{
              padding: "var(--space-6) 0",
              borderBottom:
                i === FAQ.length - 1
                  ? "none"
                  : "1px solid var(--border-subtle)",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              columnGap: "var(--space-4)",
              rowGap: "var(--space-2)",
              alignItems: "baseline",
            }}
          >
            <span
              aria-hidden
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--fg-subtle)",
                fontWeight: 500,
                letterSpacing: "0.05em",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <dt
              style={{
                color: "var(--layers-ink)",
                fontSize: "var(--text-md)",
                fontWeight: 600,
                lineHeight: 1.35,
                letterSpacing: "-0.005em",
              }}
            >
              {item.q}
            </dt>
            <span aria-hidden />
            <dd
              style={{
                margin: 0,
                color: "var(--fg-muted)",
                fontSize: "var(--text-sm)",
                lineHeight: 1.6,
                maxWidth: "62ch",
              }}
            >
              {item.a}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function FinalCta() {
  return (
    <section
      aria-label="Get started"
      style={{
        width: "min(100% - 40px, 1180px)",
        margin: "var(--section-y) auto 0",
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "clamp(40px, 5vw, 80px) clamp(24px, 4vw, 64px)",
          borderRadius: "var(--radius-2xl)",
          background:
            "radial-gradient(circle at 0% 100%, color-mix(in oklch, var(--layers-mint-tint) 80%, transparent), transparent 55%), radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--layers-violet-tint) 65%, transparent), transparent 55%), var(--bg-surface)",
          border: "1px solid var(--border-default)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
          gap: "var(--gutter)",
          alignItems: "center",
        }}
        className="pricing-final-cta"
      >
        <div>
          <h2
            style={{
              color: "var(--layers-ink)",
              fontSize: "clamp(1.75rem, 3.6vw, 2.8rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.08,
              maxWidth: "20ch",
              margin: 0,
            }}
          >
            Start with twenty-five free meetings.{" "}
            <em
              style={{
                fontStyle: "italic",
                fontWeight: 500,
                color: "var(--brand-accent-muted)",
              }}
            >
              Decide later.
            </em>
          </h2>
          <p
            style={{
              marginTop: "var(--space-4)",
              color: "var(--fg-muted)",
              fontSize: "var(--text-md)",
              lineHeight: 1.55,
              maxWidth: "52ch",
            }}
          >
            Layers remembers what matters from every conversation so your team
            can make better decisions and ship faster. No card required —
            upgrade when it earns it, never before.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            alignItems: "stretch",
          }}
        >
          <Link
            href="/sign-up"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              padding: "16px 22px",
              borderRadius: "var(--radius-pill)",
              background: "var(--layers-ink)",
              color: "var(--bg-surface)",
              fontSize: "var(--text-md)",
              fontWeight: 600,
              textDecoration: "none",
              letterSpacing: "-0.005em",
            }}
          >
            Coming soon
            <ArrowRight size={17} aria-hidden />
          </Link>
          <Link
            href="/download"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 22px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--border-default)",
              background: "color-mix(in oklch, var(--bg-surface) 86%, transparent)",
              color: "var(--layers-ink)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Download the app
          </Link>
        </div>
      </div>
    </section>
  );
}
