"use client";

import Link from "next/link";
import { Bricolage_Grotesque } from "next/font/google";
import AudioWaveRibbon from "@/components/audio-wave-ribbon";
import { LayersLogoMark } from "@/components/layers-logo";

/*
 * Layers homepage — Paper Calm v1.0
 *
 * Display face: Bricolage Grotesque (variable, optical-size aware).
 *   Picked for "settled · attentive · purposeful". Optical-size axis lets
 *   headlines breathe at large sizes. Italic moments via system serif fallback
 *   so the mission line gets a true italic-serif inflection.
 *
 * Body face: Geist Sans (already loaded globally via app/layout.tsx as
 *   --font-sans), kept to maintain product-wide UI/marketing parity.
 */

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display-marketing",
  display: "swap",
});

// Pricing — `name: "Free" / price: "$0"`, etc. literal strings are enforced
// by tests/pricing-consistency.test.ts. Keep them verbatim.
const PRICING = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "25 meetings/mo. Try the memory before you commit.",
    features: [
      "25 meetings per month",
      "Searchable transcript & decisions",
      "1 export integration",
    ],
    href: "/sign-up",
    cta: "Coming soon",
  },
  {
    name: "Core",
    price: "$20",
    cadence: "per user · per month",
    blurb: "Unlimited meetings, AI memory, search, exports.",
    features: [
      "Unlimited meetings",
      "Cross-meeting AI memory",
      "All exports & integrations",
    ],
    href: "/pricing",
    cta: "See Core",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$30",
    cadence: "per user · per month",
    blurb: "Team memory, advanced privacy, priority support.",
    features: [
      "Shared team memory",
      "Advanced privacy & SSO",
      "Priority support",
    ],
    href: "/pricing",
    cta: "See Pro",
  },
];

const TRUST_LOGOS = ["Linear", "Vercel", "dribbble", "Notion", "Lattice", "Retool"];

const WORKS_WITH = [
  { label: "ChatGPT", color: "var(--layers-mint)" },
  { label: "Claude", color: "var(--layers-violet)" },
  { label: "Gemini", color: "var(--layers-blue)" },
  { label: "MCP clients", color: "var(--brand-accent-subtle, var(--layers-mint))" },
];

export function LandingPage() {
  return (
    <div className={`${display.variable} layers-home`}>
      <Hero />
      <TrustBar />
      <SectionMemory />
      <SectionSearch />
      <SectionReuse />
      <SectionPricing />
      <FinalCta />

      <style jsx>{`
        .layers-home {
          background: var(--bg-page);
          color: var(--fg-default);
          font-family: var(--font-sans, var(--font-brand-sans));
        }

        .layers-home :global(.home-display) {
          font-family: var(--font-display-marketing), var(--font-brand-sans);
          letter-spacing: -0.022em;
          font-weight: 500;
          font-feature-settings: "ss01", "ss02";
        }

        .layers-home :global(.home-italic-serif) {
          font-family: "Iowan Old Style", "Charter", "Georgia", serif;
          font-style: italic;
          font-weight: 400;
          color: var(--brand-accent-subtle, var(--layers-mint));
          letter-spacing: -0.012em;
        }

        .layers-home :global(.home-eyebrow) {
          font-size: 0.7rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 600;
          color: var(--fg-muted);
        }

        .layers-home :global(.home-prose) {
          max-width: 60ch;
          color: var(--fg-muted);
          line-height: 1.55;
        }

        .layers-home :global(.home-pill) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: var(--radius-pill);
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          font-size: 0.8rem;
          color: var(--fg-default);
          white-space: nowrap;
        }
        .layers-home :global(.home-pill-dot) {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--layers-mint);
          box-shadow: 0 0 0 4px
            color-mix(in oklch, var(--layers-mint) 18%, transparent);
        }

        .layers-home :global(.btn-primary) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 13px 22px;
          border-radius: var(--radius-pill);
          background: var(--layers-mint-soft);
          color: var(--layers-ink);
          font-weight: 600;
          font-size: 0.95rem;
          letter-spacing: -0.005em;
          text-decoration: none;
          border: 1px solid
            color-mix(in oklch, var(--layers-mint) 60%, var(--layers-ink) 12%);
          transition:
            transform var(--duration-fast) var(--ease-out),
            background var(--duration-normal) var(--ease-out),
            box-shadow var(--duration-fast) var(--ease-out);
          box-shadow: 0 1px 0
            color-mix(in oklch, var(--layers-mint) 28%, transparent);
        }
        .layers-home :global(.btn-primary:hover) {
          background: color-mix(
            in oklch,
            var(--layers-mint-soft) 86%,
            var(--layers-mint) 14%
          );
          transform: translateY(-1px);
        }
        .layers-home :global(.btn-primary[disabled]),
        .layers-home :global(.btn-primary:disabled) {
          opacity: 0.66;
          cursor: not-allowed;
          transform: none;
        }
        .layers-home :global(.btn-primary[disabled]:hover) {
          transform: none;
          background: var(--layers-mint-soft);
        }

        .layers-home :global(.btn-ghost) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px 20px;
          font-weight: 500;
          font-size: 0.95rem;
          color: var(--fg-default);
          text-decoration: none;
          border-radius: var(--radius-pill);
          background: transparent;
          border: 1px solid var(--border-default);
          transition:
            color var(--duration-fast) var(--ease-out),
            border-color var(--duration-fast) var(--ease-out),
            background var(--duration-fast) var(--ease-out);
        }
        .layers-home :global(.btn-ghost:hover) {
          background: var(--bg-surface);
          border-color: color-mix(
            in oklch,
            var(--fg-default) 30%,
            var(--border-default) 70%
          );
        }

        .layers-home :global(.section-shell) {
          padding-inline: clamp(20px, 5vw, 56px);
          padding-block: clamp(64px, 8vw, 112px);
          max-width: 1240px;
          margin-inline: auto;
        }

        @media (prefers-reduced-motion: reduce) {
          .layers-home :global(.btn-primary),
          .layers-home :global(.btn-primary:hover) {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */

function Hero() {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="section-shell"
      style={{ paddingBlock: "clamp(48px, 7vw, 96px)" }}
    >
      <div
        className="home-hero-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.05fr)",
          gap: "clamp(32px, 5vw, 80px)",
          alignItems: "center",
        }}
      >
        <div style={{ display: "grid", gap: 24 }}>
          <h1
            id="home-hero-heading"
            className="home-display"
            style={{
              fontSize: "clamp(2.5rem, 5vw + 0.5rem, 4.6rem)",
              lineHeight: 1.04,
              margin: 0,
              color: "var(--fg-default)",
              letterSpacing: "-0.028em",
              maxWidth: "13ch",
            }}
          >
            AI memory for your meetings.
            <br />
            <span
              className="home-italic-serif"
              style={{ fontSize: "0.78em", display: "inline-block", marginTop: 6 }}
            >
              Decisions that move work forward.
            </span>
          </h1>

          <p
            className="home-prose"
            style={{
              fontSize: "clamp(1.05rem, 0.5vw + 0.95rem, 1.18rem)",
              margin: 0,
              maxWidth: "44ch",
            }}
          >
            Layers remembers what matters from every conversation so your team
            can make better decisions and ship faster.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <button
              type="button"
              className="btn-primary"
              disabled
              aria-disabled="true"
              title="Public sign-ups coming soon — invite-only alpha"
            >
              Coming soon
            </button>
            <Link href="/download" className="btn-ghost">
              See how it works
            </Link>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 8,
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--fg-faint)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginRight: 4,
              }}
            >
              Works with
            </span>
            {WORKS_WITH.map((w) => (
              <span key={w.label} className="home-pill">
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: w.color,
                    boxShadow: `0 0 0 3px color-mix(in oklch, ${w.color} 18%, transparent)`,
                  }}
                />
                {w.label}
              </span>
            ))}
          </div>
        </div>

        <HeroComposition />
      </div>

      <style jsx>{`
        @media (max-width: 920px) {
          :global(.home-hero-grid) {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}

function HeroComposition() {
  return (
    <div
      aria-hidden
      style={{
        position: "relative",
        minHeight: "clamp(380px, 44vw, 480px)",
        isolation: "isolate",
      }}
    >
      {/* Soft mint halo behind composition */}
      <div
        style={{
          position: "absolute",
          inset: "10% -10% 10% -5%",
          background:
            "radial-gradient(ellipse at 60% 50%, color-mix(in oklch, var(--layers-mint-tint) 65%, transparent) 0%, transparent 65%)",
          filter: "blur(2px)",
          zIndex: 0,
        }}
      />

      {/* Main recording workspace card */}
      <div
        style={{
          position: "absolute",
          left: "8%",
          top: "10%",
          right: "8%",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-2xl, 20px)",
          padding: "20px 22px 22px",
          boxShadow:
            "0 30px 60px -30px color-mix(in oklch, var(--layers-violet) 22%, transparent), 0 6px 18px -10px color-mix(in oklch, var(--fg-default) 12%, transparent)",
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LayersLogoMark size={22} animated />
            <span
              style={{
                fontSize: "0.78rem",
                color: "var(--fg-muted)",
                letterSpacing: "0.04em",
              }}
            >
              Recording workspace
            </span>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--danger, oklch(0.64 0.20 26))",
              padding: "3px 10px",
              borderRadius: "var(--radius-pill)",
              background:
                "color-mix(in oklch, var(--danger, oklch(0.64 0.20 26)) 8%, transparent)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "var(--danger, oklch(0.64 0.20 26))",
                animation: "homePulse 1.6s ease-in-out infinite",
              }}
            />
            00:13 LIVE
          </span>
        </div>

        <div
          style={{
            borderRadius: "var(--radius-lg, 14px)",
            padding: "10px 8px 4px",
            background:
              "linear-gradient(180deg, color-mix(in oklch, var(--layers-mint-tint) 40%, var(--bg-page)) 0%, var(--bg-surface) 100%)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <AudioWaveRibbon
            active
            audioLevel={0.62}
            height={96}
            motion={1.05}
            sensitivity={0.82}
            texture="clean"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          {[
            ["Decisions", "2"],
            ["Actions", "3"],
            ["Intake", "3"],
            ["Follow-up", "2"],
          ].map(([label, count]) => (
            <div key={label} style={{ display: "grid", gap: 2 }}>
              <span
                className="home-display"
                style={{
                  fontSize: "1.1rem",
                  lineHeight: 1,
                  color: "var(--fg-default)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {count}
              </span>
              <span
                style={{
                  fontSize: "0.66rem",
                  color: "var(--fg-muted)",
                  letterSpacing: "0.04em",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating: AI memory · Always learning */}
      <FloatingChip
        style={{ top: "2%", left: "-2%", zIndex: 3 }}
        accent="var(--layers-violet)"
        label="AI memory"
        sub="Always learning"
      />

      {/* Floating: Decisions 2 Captured */}
      <FloatingStat
        style={{ top: "4%", right: "-4%", zIndex: 3 }}
        value="2"
        label="Decisions"
        sub="Captured"
        accent="var(--layers-mint)"
      />

      {/* Floating: Live transcript card */}
      <div
        style={{
          position: "absolute",
          left: "-4%",
          top: "44%",
          width: "62%",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg, 14px)",
          padding: "12px 14px",
          boxShadow:
            "0 12px 28px -16px color-mix(in oklch, var(--fg-default) 22%, transparent)",
          zIndex: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--layers-blue)",
            }}
          />
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--fg-default)",
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            Live transcript
          </span>
          <span style={{ fontSize: "0.66rem", color: "var(--fg-muted)" }}>
            · Captured live
          </span>
        </div>
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gap: 6,
            fontSize: "0.74rem",
          }}
        >
          {[
            ["00:11", "Commit to ship onboarding first."],
            ["00:14", "Jamie owns first-run copy by Friday."],
          ].map(([t, line]) => (
            <li
              key={t as string}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: 10,
                alignItems: "baseline",
                color: "var(--fg-default)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono, ui-monospace)",
                  color: "var(--fg-faint)",
                }}
              >
                {t}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Floating: Meeting memory · Updating */}
      <div
        style={{
          position: "absolute",
          right: "-2%",
          top: "52%",
          width: "52%",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg, 14px)",
          padding: "12px 14px",
          boxShadow:
            "0 14px 28px -16px color-mix(in oklch, var(--layers-violet) 22%, transparent)",
          zIndex: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "var(--fg-default)",
            }}
          >
            Meeting memory
          </span>
          <span
            style={{
              fontSize: "0.66rem",
              color: "var(--brand-accent-subtle, var(--layers-mint))",
              letterSpacing: "0.04em",
            }}
          >
            Updating…
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            fontSize: "0.7rem",
          }}
        >
          {[
            ["Decisions", "2"],
            ["Actions", "3"],
            ["Intake", "3"],
            ["Follow-up", "2"],
          ].map(([k, v]) => (
            <div
              key={k as string}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 8px",
                borderRadius: 6,
                background:
                  "color-mix(in oklch, var(--layers-mint-tint) 35%, transparent)",
              }}
            >
              <span style={{ color: "var(--fg-muted)" }}>{k}</span>
              <span style={{ color: "var(--fg-default)", fontWeight: 600 }}>
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating: Actions 4 Assigned */}
      <FloatingStat
        style={{ bottom: "10%", left: "10%", zIndex: 5 }}
        value="4"
        label="Actions"
        sub="Assigned"
        accent="var(--layers-blue)"
      />

      {/* Floating: Follow-ups 2 Planned */}
      <FloatingStat
        style={{ bottom: "8%", right: "8%", zIndex: 5 }}
        value="2"
        label="Follow-ups"
        sub="Planned"
        accent="var(--layers-violet)"
      />

      <style jsx>{`
        @keyframes homePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function FloatingChip({
  style,
  accent,
  label,
  sub,
}: {
  style?: React.CSSProperties;
  accent: string;
  label: string;
  sub: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-pill, 9999px)",
        padding: "8px 14px",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        boxShadow:
          "0 10px 24px -14px color-mix(in oklch, var(--fg-default) 18%, transparent)",
        ...style,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: accent,
          boxShadow: `0 0 0 4px color-mix(in oklch, ${accent} 18%, transparent)`,
        }}
      />
      <span
        style={{
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "var(--fg-default)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "0.74rem",
          color: "var(--fg-muted)",
        }}
      >
        · {sub}
      </span>
    </div>
  );
}

function FloatingStat({
  style,
  value,
  label,
  sub,
  accent,
}: {
  style?: React.CSSProperties;
  value: string;
  label: string;
  sub: string;
  accent: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg, 14px)",
        padding: "10px 14px",
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        boxShadow:
          "0 14px 28px -16px color-mix(in oklch, var(--fg-default) 18%, transparent)",
        ...style,
      }}
    >
      <span
        className="home-display"
        style={{
          fontSize: "1.5rem",
          lineHeight: 1,
          color: accent,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
        }}
      >
        {value}
      </span>
      <span style={{ display: "grid", lineHeight: 1.1 }}>
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "var(--fg-default)",
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: "0.7rem", color: "var(--fg-muted)" }}>
          {sub}
        </span>
      </span>
    </div>
  );
}

/* ───────────────────────────── Trust bar ───────────────────────────── */

function TrustBar() {
  return (
    <section
      aria-label="Teams using Layers"
      className="section-shell"
      style={{
        paddingBlock: "clamp(32px, 4vw, 56px)",
        display: "grid",
        gap: 20,
        justifyItems: "center",
        textAlign: "center",
      }}
    >
      <span className="home-eyebrow">Trusted by product & GTM teams</span>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(20px, 4vw, 56px)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {TRUST_LOGOS.map((name) => (
          <li
            key={name}
            style={{
              fontFamily: "var(--font-display-marketing), var(--font-brand-sans)",
              fontSize: "clamp(1.05rem, 1vw + 0.7rem, 1.4rem)",
              fontWeight: 600,
              letterSpacing: "-0.018em",
              color: "var(--fg-muted)",
              opacity: 0.78,
            }}
          >
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────── Section 01 — AI memory that works for you ─────────────── */

function SectionMemory() {
  return (
    <section
      aria-labelledby="home-memory-heading"
      className="section-shell"
    >
      <NumberedSection
        index="01"
        eyebrow="AI memory that works for you"
        heading={
          <>
            Your AI copilots learn from{" "}
            <span className="home-italic-serif">every meeting.</span>
          </>
        }
        lede="Layers builds a structured record of what your team decided, owns, and said — and feeds that context to the AI tools you already use."
        bullets={[
          "Decisions, actions, and customer signal — captured automatically",
          "Speaker-aware. Topic-aware. Updated as the meeting unfolds",
          "Shared with ChatGPT, Claude, Gemini, and any MCP-aware tool",
        ]}
        media={<MemoryMediaCard />}
        mediaSide="right"
      />
    </section>
  );
}

function MemoryMediaCard() {
  return (
    <div
      aria-hidden
      style={{
        position: "relative",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-2xl, 20px)",
        padding: "22px 22px 24px",
        boxShadow:
          "0 28px 60px -32px color-mix(in oklch, var(--layers-violet) 25%, transparent)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: "0.78rem",
            color: "var(--fg-default)",
            fontWeight: 600,
          }}
        >
          Meeting memory
        </span>
        <span
          style={{
            fontSize: "0.7rem",
            color: "var(--brand-accent-subtle, var(--layers-mint))",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Updating
        </span>
      </div>

      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        {[
          {
            tag: "What happened",
            color: "var(--layers-blue)",
            text: "Maya led a planning sync. Team aligned on Q3 onboarding scope.",
          },
          {
            tag: "Decision",
            color: "var(--layers-mint)",
            text: "Ship onboarding before team sharing. Revisit June 12.",
          },
          {
            tag: "Action",
            color: "var(--layers-violet)",
            text: "Jamie · first-run copy by Friday. Owen reviews Monday.",
          },
        ].map((row) => (
          <div
            key={row.tag}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 12,
              alignItems: "baseline",
              padding: "10px 12px",
              borderRadius: "var(--radius-md, 10px)",
              background:
                "color-mix(in oklch, var(--bg-page) 60%, var(--bg-surface) 40%)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span
              style={{
                fontSize: "0.66rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: row.color,
                whiteSpace: "nowrap",
              }}
            >
              {row.tag}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--fg-default)" }}>
              {row.text}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          height: 64,
          borderRadius: "var(--radius-md, 10px)",
          background:
            "linear-gradient(180deg, color-mix(in oklch, var(--layers-violet-tint) 70%, var(--bg-surface)) 0%, var(--bg-surface) 100%)",
          padding: "8px 6px 0",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <AudioWaveRibbon
          active
          audioLevel={0.42}
          height={48}
          motion={0.85}
          sensitivity={0.62}
          texture="clean"
        />
      </div>
    </div>
  );
}

/* ─────────────── Section 02 — Search that finds answers ─────────────── */

function SectionSearch() {
  return (
    <section
      aria-labelledby="home-search-heading"
      className="section-shell"
    >
      <NumberedSection
        index="02"
        eyebrow="Search that finds answers"
        heading={
          <>
            Find the decision without{" "}
            <span className="home-italic-serif">reopening every transcript.</span>
          </>
        }
        lede="Ask in your own words. Layers jumps to the moment — across every meeting your team has had."
        bullets={[
          "Natural-language queries jump to the exact timestamp",
          "Cross-meeting search finds patterns across every call",
          "Filter by speaker, decision type, or customer",
        ]}
        media={<SearchMediaCard />}
        mediaSide="left"
      />
    </section>
  );
}

function SearchMediaCard() {
  return (
    <div
      aria-hidden
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-2xl, 20px)",
        padding: "20px 22px 22px",
        boxShadow:
          "0 28px 60px -32px color-mix(in oklch, var(--layers-blue) 22%, transparent)",
        display: "grid",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            borderRadius: "var(--radius-pill)",
            background: "var(--bg-page)",
            border: "1px solid var(--border-subtle)",
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              border: "1.5px solid var(--fg-muted)",
              position: "relative",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "0.85rem",
              color: "var(--fg-default)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            What did we decide about pricing?
          </span>
        </div>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "var(--ink, var(--fg-default))",
            padding: "5px 10px",
            borderRadius: "var(--radius-pill)",
            background:
              "color-mix(in oklch, var(--layers-mint) 30%, var(--bg-surface) 70%)",
            border: "1px solid color-mix(in oklch, var(--layers-mint) 50%, transparent)",
            whiteSpace: "nowrap",
          }}
        >
          Found in 18 meetings
        </span>
      </div>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: 8,
        }}
      >
        {[
          ["00:35", "Product planning", "“Tier at $20 hits the sweet spot — agreed.”"],
          ["12:08", "Customer feedback", "“They expected higher pricing for the pro tier.”"],
          ["27:42", "GTM sync", "“Free 25-meeting cap — anchor on usage, not seats.”"],
        ].map(([time, ctx, quote]) => (
          <li
            key={time as string}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              columnGap: 14,
              rowGap: 2,
              padding: "10px 12px",
              borderRadius: "var(--radius-md, 10px)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-page)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: "0.78rem",
                color: "var(--brand-accent-subtle, var(--layers-mint))",
                fontWeight: 600,
                gridRow: "span 2",
                alignSelf: "center",
              }}
            >
              {time}
            </span>
            <span
              style={{
                fontSize: "0.78rem",
                color: "var(--fg-default)",
                fontWeight: 600,
              }}
            >
              {ctx}
            </span>
            <span style={{ fontSize: "0.78rem", color: "var(--fg-muted)" }}>
              {quote}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────── Section 03 — Reuse what matters ─────────────── */

function SectionReuse() {
  return (
    <section
      aria-labelledby="home-reuse-heading"
      className="section-shell"
    >
      <NumberedSection
        index="03"
        eyebrow="Reuse what matters"
        heading={
          <>
            Turn conversations into{" "}
            <span className="home-italic-serif">reusable assets.</span>
          </>
        }
        lede="Decision logs, action trackers, customer updates — generated from every meeting and routed where your team already works."
        bullets={[
          "One-click summaries, decision logs, and action trackers",
          "Templates per meeting type — customer, planning, 1:1",
          "Send to Slack, Notion, Drive, or email automatically",
        ]}
        media={<ReuseMediaCard />}
        mediaSide="right"
      />
    </section>
  );
}

function ReuseMediaCard() {
  const tabs = ["Outputs", "Templates", "Integrations"];
  const outputs = [
    { name: "Summary doc", icon: "W", color: "var(--layers-blue)" },
    { name: "Decision log", icon: "S", color: "var(--layers-mint)" },
    { name: "Action tracker", icon: "D", color: "var(--layers-violet)" },
    { name: "Customer update", icon: "M", color: "var(--warning, oklch(0.74 0.14 74))" },
  ];

  return (
    <div
      aria-hidden
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-2xl, 20px)",
        padding: "20px 22px 22px",
        boxShadow:
          "0 28px 60px -32px color-mix(in oklch, var(--layers-mint) 22%, transparent)",
        display: "grid",
        gap: 16,
      }}
    >
      <div
        role="tablist"
        style={{
          display: "inline-flex",
          padding: 4,
          borderRadius: "var(--radius-pill)",
          background: "var(--bg-page)",
          border: "1px solid var(--border-subtle)",
          width: "fit-content",
          gap: 2,
        }}
      >
        {tabs.map((t, i) => (
          <span
            key={t}
            role="tab"
            aria-selected={i === 0}
            style={{
              fontSize: "0.78rem",
              padding: "6px 14px",
              borderRadius: "var(--radius-pill)",
              fontWeight: 500,
              color: i === 0 ? "var(--fg-default)" : "var(--fg-muted)",
              background: i === 0 ? "var(--bg-surface)" : "transparent",
              boxShadow:
                i === 0
                  ? "0 1px 0 color-mix(in oklch, var(--fg-default) 8%, transparent)"
                  : "none",
            }}
          >
            {t}
          </span>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {outputs.map((o) => (
          <div
            key={o.name}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 10,
              alignItems: "center",
              padding: "12px 14px",
              borderRadius: "var(--radius-md, 10px)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-page)",
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                background: `color-mix(in oklch, ${o.color} 22%, var(--bg-surface) 78%)`,
                color: o.color,
                fontWeight: 700,
                fontSize: "0.78rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display-marketing), var(--font-brand-sans)",
              }}
            >
              {o.icon}
            </span>
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "var(--fg-default)",
              }}
            >
              {o.name}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingTop: 12,
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <span
          style={{
            fontSize: "0.74rem",
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}
        >
          Share to
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            ["Notion", "var(--fg-default)"],
            ["Slack", "var(--layers-violet)"],
            ["Drive", "var(--layers-blue)"],
          ].map(([name, color]) => (
            <span
              key={name}
              title={name}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: `color-mix(in oklch, ${color} 14%, var(--bg-surface) 86%)`,
                color,
                fontSize: "0.7rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {(name as string).slice(0, 1)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Numbered section primitive ─────────────── */

function NumberedSection({
  index,
  eyebrow,
  heading,
  lede,
  bullets,
  media,
  mediaSide,
}: {
  index: string;
  eyebrow: string;
  heading: React.ReactNode;
  lede: string;
  bullets: string[];
  media: React.ReactNode;
  mediaSide: "left" | "right";
}) {
  const textBlock = (
    <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          className="home-display"
          style={{
            fontSize: "0.78rem",
            fontVariantNumeric: "tabular-nums",
            color: "var(--brand-accent-subtle, var(--layers-mint))",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          {index}
        </span>
        <span
          aria-hidden
          style={{
            height: 1,
            width: 28,
            background: "var(--border-default)",
          }}
        />
        <span className="home-eyebrow">{eyebrow}</span>
      </div>
      <h2
        className="home-display"
        style={{
          fontSize: "clamp(1.85rem, 2.4vw + 0.6rem, 2.8rem)",
          lineHeight: 1.08,
          margin: 0,
          letterSpacing: "-0.024em",
          maxWidth: "20ch",
        }}
      >
        {heading}
      </h2>
      <p className="home-prose" style={{ margin: 0, fontSize: "1.02rem" }}>
        {lede}
      </p>
      <ul
        style={{
          listStyle: "none",
          margin: 4,
          padding: 0,
          display: "grid",
          gap: 10,
        }}
      >
        {bullets.map((b) => (
          <li
            key={b}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 12,
              alignItems: "baseline",
              fontSize: "0.95rem",
              color: "var(--fg-default)",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 16,
                height: 16,
                borderRadius: 999,
                background:
                  "color-mix(in oklch, var(--layers-mint) 30%, var(--bg-surface) 70%)",
                border:
                  "1px solid color-mix(in oklch, var(--layers-mint) 60%, transparent)",
                color: "var(--ink, var(--fg-default))",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.6rem",
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              ✓
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div
      className="numbered-row"
      style={{
        display: "grid",
        gridTemplateColumns:
          mediaSide === "right"
            ? "minmax(0, 1fr) minmax(0, 1.05fr)"
            : "minmax(0, 1.05fr) minmax(0, 1fr)",
        gap: "clamp(28px, 5vw, 80px)",
        alignItems: "center",
      }}
    >
      {mediaSide === "right" ? (
        <>
          {textBlock}
          {media}
        </>
      ) : (
        <>
          {media}
          {textBlock}
        </>
      )}

      <style jsx>{`
        @media (max-width: 880px) {
          :global(.numbered-row) {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ─────────────── Section 04 — Pricing ─────────────── */

function SectionPricing() {
  return (
    <section
      aria-labelledby="home-pricing-heading"
      className="section-shell"
    >
      <div
        className="pricing-row"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.4fr)",
          gap: "clamp(28px, 4vw, 64px)",
          alignItems: "center",
        }}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              className="home-display"
              style={{
                fontSize: "0.78rem",
                color: "var(--brand-accent-subtle, var(--layers-mint))",
                fontWeight: 600,
              }}
            >
              04
            </span>
            <span aria-hidden style={{ height: 1, width: 28, background: "var(--border-default)" }} />
            <span className="home-eyebrow">Built for teams at every stage</span>
          </div>
          <h2
            id="home-pricing-heading"
            className="home-display"
            style={{
              fontSize: "clamp(1.85rem, 2.4vw + 0.6rem, 2.8rem)",
              lineHeight: 1.08,
              margin: 0,
              letterSpacing: "-0.024em",
              maxWidth: "16ch",
            }}
          >
            Simple pricing.{" "}
            <span className="home-italic-serif">Serious value.</span>
          </h2>
          <p className="home-prose" style={{ margin: 0, fontSize: "1.02rem" }}>
            Start free with 25 meetings. Upgrade when memory becomes a habit
            your team can't work without.
          </p>
        </div>

        <div
          className="pricing-strip"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 0,
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-2xl, 20px)",
            background: "var(--bg-surface)",
            overflow: "hidden",
          }}
        >
          {PRICING.map((tier, i) => (
            <article
              key={tier.name}
              className="pricing-cell"
              style={{
                padding: "clamp(20px, 2.4vw, 28px)",
                borderInlineStart:
                  i === 0 ? "none" : "1px solid var(--border-subtle)",
                background: tier.highlight
                  ? "color-mix(in oklch, var(--layers-mint-tint) 60%, var(--bg-surface) 40%)"
                  : "transparent",
                display: "grid",
                gap: 14,
                alignContent: "start",
                position: "relative",
              }}
            >
              {tier.highlight ? (
                <span
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    fontSize: "0.62rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color: "var(--ink, var(--fg-default))",
                    padding: "3px 8px",
                    borderRadius: "var(--radius-pill)",
                    background:
                      "color-mix(in oklch, var(--layers-mint) 55%, var(--bg-surface) 45%)",
                  }}
                >
                  Most popular
                </span>
              ) : null}

              <header style={{ display: "grid", gap: 8 }}>
                <span
                  className="home-display"
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "var(--fg-default)",
                  }}
                >
                  {tier.name}
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span
                    className="home-display"
                    style={{
                      fontSize: "clamp(2.1rem, 2.6vw, 2.7rem)",
                      lineHeight: 1,
                      color: "var(--fg-default)",
                      letterSpacing: "-0.025em",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 600,
                    }}
                  >
                    {tier.price}
                  </span>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--fg-muted)",
                    }}
                  >
                    {tier.cadence}
                  </span>
                </div>
              </header>

              <p
                style={{
                  margin: 0,
                  fontSize: "0.86rem",
                  color: "var(--fg-muted)",
                  lineHeight: 1.5,
                }}
              >
                {tier.blurb}
              </p>

              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "grid",
                  gap: 8,
                }}
              >
                {tier.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: 10,
                      alignItems: "baseline",
                      fontSize: "0.82rem",
                      color: "var(--fg-default)",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 999,
                        background:
                          "color-mix(in oklch, var(--layers-mint) 24%, var(--bg-surface) 76%)",
                        color: "var(--ink, var(--fg-default))",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.55rem",
                        fontWeight: 700,
                        marginTop: 4,
                      }}
                    >
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {tier.cta === "Coming soon" ? (
                <button
                  type="button"
                  className={tier.highlight ? "btn-primary" : "btn-ghost"}
                  disabled
                  aria-disabled="true"
                  title="Public sign-ups coming soon — invite-only alpha"
                  style={{ marginTop: 4 }}
                >
                  {tier.cta}
                </button>
              ) : (
                <Link
                  href={tier.href}
                  className={tier.highlight ? "btn-primary" : "btn-ghost"}
                  style={{ marginTop: 4 }}
                >
                  {tier.cta}
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 920px) {
          :global(.pricing-row) {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
        @media (max-width: 720px) {
          :global(.pricing-strip) {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          :global(.pricing-cell) {
            border-inline-start: none !important;
            border-top: 1px solid var(--border-subtle);
          }
          :global(.pricing-cell:first-child) {
            border-top: none;
          }
        }
      `}</style>
    </section>
  );
}

/* ─────────────── Final CTA card ─────────────── */

function FinalCta() {
  return (
    <section
      aria-labelledby="home-cta-heading"
      className="section-shell"
      style={{ paddingBottom: "clamp(80px, 10vw, 144px)" }}
    >
      <div
        className="cta-card"
        style={{
          position: "relative",
          borderRadius: "var(--radius-2xl, 20px)",
          background:
            "linear-gradient(135deg, var(--bg-surface) 0%, color-mix(in oklch, var(--layers-mint-tint) 55%, var(--bg-surface) 45%) 100%)",
          border: "1px solid var(--border-default)",
          padding: "clamp(36px, 5vw, 72px) clamp(24px, 4vw, 64px)",
          overflow: "hidden",
          display: "grid",
          gap: 28,
          alignItems: "center",
          gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, auto)",
        }}
      >
        <div style={{ display: "grid", gap: 14, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LayersLogoMark size={32} animated />
            <span className="home-eyebrow">The next meeting starts soon</span>
          </div>
          <h2
            id="home-cta-heading"
            className="home-display"
            style={{
              fontSize: "clamp(1.85rem, 3vw + 0.5rem, 3rem)",
              lineHeight: 1.06,
              margin: 0,
              letterSpacing: "-0.025em",
              maxWidth: "22ch",
            }}
          >
            Ready to make every meeting{" "}
            <span className="home-italic-serif">count?</span>
          </h2>
          <p className="home-prose" style={{ margin: 0, maxWidth: "44ch" }}>
            Join teams that ship faster with better context.
          </p>
        </div>

        <div
          className="cta-actions"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "stretch",
            minWidth: 220,
          }}
        >
          <button
            type="button"
            className="btn-primary"
            disabled
            aria-disabled="true"
            title="Public sign-ups coming soon — invite-only alpha"
          >
            Coming soon
          </button>
          <Link
            href="mailto:support@mirrorfactory.ai?subject=Demo%20request"
            className="btn-ghost"
          >
            Book a demo
          </Link>
        </div>

        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -120,
            bottom: -140,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--layers-mint) 22%, transparent) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
      </div>

      <style jsx>{`
        @media (max-width: 760px) {
          :global(.cta-card) {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}

export default LandingPage;
