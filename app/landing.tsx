"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileText,
  ListChecks,
  Search,
  Sparkles,
} from "lucide-react";
import AudioWaveRibbon from "@/components/audio-wave-ribbon";

const TRUST_ITEMS = [
  "25 meetings free",
  "No meeting bot",
  "Google Calendar + Outlook",
  "ChatGPT, Claude, MCP ready",
  "Transparent usage",
];

const FLOW_STEPS = [
  {
    eyebrow: "Calendar event",
    title: "Product planning",
    meta: "Tue, Apr 28 - 10:00 AM",
    icon: CalendarDays,
    tone: "mint",
    details: ["Focus area", "45 min"],
  },
  {
    eyebrow: "Live capture",
    title: "No meeting bot",
    meta: "00:13",
    icon: AudioLines,
    tone: "violet",
    details: ["Live", "Writing notes"],
  },
  {
    eyebrow: "Transcript",
    title: "Speaker-aware notes",
    meta: "0:18 Calendar context should appear first.",
    icon: FileText,
    tone: "blue",
    details: ["0:04 Decisions", "0:35 Follow-up"],
  },
  {
    eyebrow: "Decisions / Actions / Intake",
    title: "Structured outputs",
    meta: "Owners, due dates, and clean next steps.",
    icon: ListChecks,
    tone: "mint",
    details: ["2 decisions", "4 actions"],
  },
  {
    eyebrow: "Searchable memory",
    title: "Find every answer",
    meta: "onboarding - pricing - Q2 roadmap",
    icon: Search,
    tone: "slate",
    details: ["4 matches", "All meetings"],
  },
  {
    eyebrow: "Connected AI tools",
    title: "Ask from anywhere",
    meta: "ChatGPT, Claude, Gemini, and MCP clients.",
    icon: Sparkles,
    tone: "violet",
    details: ["AI ready", "Tool context"],
  },
];

const TOOL_CARDS = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    mark: "GPT",
    question: "What did we decide about the onboarding flow?",
    answer:
      "You decided to ship the onboarding flow first, with a focus on reducing activation steps and improving clarity in the first 60 seconds.",
    tone: "mint",
  },
  {
    id: "claude",
    name: "Claude",
    mark: "Cl",
    question: "Who owns the pricing deck and when is it due?",
    answer:
      "Alex owns the pricing deck and will share a draft by May 6. Final review is scheduled for May 9.",
    tone: "amber",
  },
  {
    id: "gemini",
    name: "Gemini",
    mark: "G",
    question: "Summarize risks we flagged for Q2.",
    answer:
      "Key risks for Q2: integration dependencies, resource constraints in design, and unclear enterprise positioning.",
    tone: "blue",
  },
];

const SEARCH_MATCHES = [
  {
    title: "Product planning session",
    meta: "Apr 28, 10:00 AM - 45 min",
    excerpt: "...focus on reducing activation steps and improving clarity of value...",
    active: true,
  },
  {
    title: "Design sync",
    meta: "Apr 21, 2:00 PM",
    excerpt: "...onboarding flow v2 wireframes...",
    active: false,
  },
  {
    title: "Customer feedback review",
    meta: "Apr 15, 11:00 AM",
    excerpt: "...users want a simpler onboarding flow...",
    active: false,
  },
  {
    title: "Marketing alignment",
    meta: "Apr 9, 9:30 AM",
    excerpt: "...positioning the onboarding flow update...",
    active: false,
  },
];

const OUTPUT_COLUMNS = [
  {
    title: "Decisions",
    count: 2,
    items: [
      "Ship the onboarding flow first to improve activation.",
      "Measure success with activation rate and time-to-value.",
    ],
  },
  {
    title: "Actions",
    count: 4,
    items: [
      "Alex to share pricing deck draft by May 6.",
      "Jamie to review onboarding copy.",
      "Taylor to set up analytics dashboard.",
      "Sam to schedule customer interviews.",
    ],
  },
  {
    title: "Intake",
    count: 3,
    items: [
      "Pricing deck feedback",
      "Customer interview themes",
      "Analytics event taxonomy",
    ],
  },
];

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "25 meetings included",
    cta: "Start for free",
    href: "/sign-up",
    features: [
      "25 meetings lifetime",
      "Transcripts and summaries",
      "Search across meetings",
      "Export and share",
    ],
  },
  {
    name: "Core",
    price: "$20",
    cadence: "per user / month",
    cta: "Start Core trial",
    href: "/pricing",
    featured: true,
    features: [
      "Unlimited meetings",
      "Enhanced speech-to-text",
      "Actions, decisions, and intake",
      "Calendar context",
      "Connect AI tools",
    ],
  },
  {
    name: "Pro",
    price: "$30",
    cadence: "per user / month",
    cta: "Start Pro trial",
    href: "/pricing",
    features: [
      "Everything in Core",
      "Team library and sharing",
      "Advanced model routing",
      "Admin controls",
      "Priority support",
    ],
  },
];

function useLandingAudioLevel() {
  const [level, setLevel] = useState(0.3);

  useEffect(() => {
    let t = 0;
    const timer = window.setInterval(() => {
      t += 0.08;
      const broad = Math.sin(t * 0.7) * 0.16;
      const detail = Math.sin(t * 1.8 + 0.7) * 0.08;
      const pulse = Math.abs(Math.sin(t * 0.43)) * 0.12;
      setLevel(0.34 + broad + detail + pulse);
    }, 70);

    return () => window.clearInterval(timer);
  }, []);

  return level;
}

function BrandMark() {
  return (
    <span className="memory-brand-mark" aria-hidden="true">
      <span />
    </span>
  );
}

function IntegrationMark({
  label,
  tone,
}: {
  label: string;
  tone: string;
}) {
  return <span className={`memory-integration-mark is-${tone}`}>{label}</span>;
}

function FlowCard({ step }: { step: (typeof FLOW_STEPS)[number] }) {
  const Icon = step.icon;
  const waveformBars = Array.from({ length: 24 }, (_, index) => index);

  return (
    <article className={`memory-flow-card is-${step.tone}`}>
      <div className="memory-flow-card-top">
        <span className="memory-flow-icon">
          <Icon size={16} aria-hidden="true" />
        </span>
        <span>{step.eyebrow}</span>
      </div>
      {step.eyebrow === "Calendar event" && (
        <div className="memory-flow-body memory-flow-calendar">
          <div className="memory-flow-event">
            <strong>{step.title}</strong>
            <span>Tue, Apr 28 - 10:00 AM</span>
            <small>45 min</small>
          </div>
          <div className="memory-flow-apps" aria-label="Calendar providers">
            <Image
              src="/layersdesign-assets/google-calendar-card.png"
              width={28}
              height={28}
              alt="Google Calendar"
            />
            <Image
              src="/layersdesign-assets/outlook-card.png"
              width={28}
              height={28}
              alt="Outlook Calendar"
            />
          </div>
        </div>
      )}
      {step.eyebrow === "Live capture" && (
        <div className="memory-flow-body memory-flow-live">
          <div className="memory-flow-mini-wave" aria-hidden="true">
            {waveformBars.map((bar) => (
              <span key={bar} />
            ))}
          </div>
          <div className="memory-flow-live-row">
            <span>Live</span>
            <time>00:13</time>
          </div>
        </div>
      )}
      {step.eyebrow === "Transcript" && (
        <div className="memory-flow-body memory-flow-transcript">
          {[
            ["00:04", "Let's review Q2 priorities."],
            ["00:18", "Focus on onboarding."],
            ["00:35", "Agreed, ship this first."],
          ].map(([time, text]) => (
            <p key={time}>
              <time>{time}</time>
              <span>{text}</span>
            </p>
          ))}
        </div>
      )}
      {step.eyebrow === "Decisions / Actions / Intake" && (
        <div className="memory-flow-body memory-flow-outputs">
          {[
            ["Decisions", "2"],
            ["Actions", "4"],
            ["Intake", "3"],
          ].map(([label, count]) => (
            <p key={label}>
              <CheckCircle2 size={13} aria-hidden="true" />
              <span>{label}</span>
              <strong>{count}</strong>
            </p>
          ))}
        </div>
      )}
      {step.eyebrow === "Searchable memory" && (
        <div className="memory-flow-body memory-flow-search">
          <div>
            <Search size={12} aria-hidden="true" />
            <span>Search your meetings...</span>
          </div>
          <p>
            {["onboarding", "pricing", "Q2 roadmap", "activation"].map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </p>
        </div>
      )}
      {step.eyebrow === "Connected AI tools" && (
        <div className="memory-flow-body memory-flow-connected">
          <span className="memory-flow-ai-mark">◎</span>
          <strong>AI</strong>
          <Sparkles size={18} aria-hidden="true" />
          <span>+</span>
        </div>
      )}
    </article>
  );
}

function HeroFlow({ audioLevel }: { audioLevel: number }) {
  return (
    <div className="memory-flow-stage" aria-label="Meeting memory pipeline signal">
      <div className="memory-flow-wave" aria-hidden="true">
        <AudioWaveRibbon
          active
          audioLevel={audioLevel}
          height={170}
          motion={1.32}
          sensitivity={1.05}
          texture="clean"
          className="memory-flow-ribbon"
        />
      </div>
      <div className="memory-flow-track">
        {FLOW_STEPS.map((step, index) => (
          <div className="memory-flow-item" key={step.eyebrow}>
            <FlowCard step={step} />
            {index < FLOW_STEPS.length - 1 && (
              <span className="memory-flow-arrow" aria-hidden="true">
                <span />
                <ArrowRight size={15} />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolCard({
  card,
  active,
  onSelect,
}: {
  card: (typeof TOOL_CARDS)[number];
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`memory-tool-card ${active ? "is-active" : ""}`}
      onClick={onSelect}
      aria-pressed={active}
    >
      <span className="memory-tool-card-head">
        <IntegrationMark label={card.mark} tone={card.tone} />
        <strong>{card.name}</strong>
      </span>
      <span className="memory-tool-question">{card.question}</span>
      <span className="memory-tool-answer">{card.answer}</span>
      <span className="memory-tool-source">
        Sourced from Layers memory
        <CheckCircle2 size={13} aria-hidden="true" />
      </span>
    </button>
  );
}

function SearchMemoryPanel() {
  return (
    <section className="memory-section memory-search-section">
      <div className="memory-section-copy">
        <h2>Search across every meeting.</h2>
        <p>
          Find decisions, owners, and context across your entire meeting
          library without reopening every transcript.
        </p>
      </div>
      <div className="memory-search-panel">
        <div className="memory-search-bar">
          <Search size={16} aria-hidden="true" />
          <span>onboarding flow</span>
          <kbd>Cmd K</kbd>
          <button type="button">Filters</button>
        </div>
        <div className="memory-search-grid">
          <div className="memory-search-list">
            {SEARCH_MATCHES.map((match) => (
              <article
                className={`memory-search-result ${match.active ? "is-active" : ""}`}
                key={match.title}
              >
                <span aria-hidden="true" />
                <div>
                  <strong>{match.title}</strong>
                  <p>{match.meta}</p>
                  <small>{match.excerpt}</small>
                </div>
              </article>
            ))}
          </div>
          <div className="memory-search-detail">
            <div className="memory-search-detail-head">
              <span>Product planning session</span>
              <Link href="/meetings">View transcript</Link>
            </div>
            {[
              ["00:18", "Focus on onboarding and activation."],
              ["00:35", "Agreed, ship the onboarding flow first."],
              ["00:52", "Reduce activation steps in the onboarding flow."],
              ["01:07", "Define success metrics for the onboarding flow update."],
            ].map(([time, text]) => (
              <p key={time}>
                <span>{time}</span>
                {text}
              </p>
            ))}
            <small>4 of 18 matches</small>
          </div>
        </div>
      </div>
    </section>
  );
}

function StructuredOutputsPanel() {
  return (
    <section className="memory-section memory-outputs-section">
      <div className="memory-section-copy">
        <h2>Structured outputs you can act on.</h2>
        <p>
          Every meeting becomes clear, organized outputs ready for your team
          and tools.
        </p>
      </div>
      <div className="memory-output-panel">
        <div className="memory-output-tabs" aria-label="Output types">
          {["Decisions", "Actions", "Intake", "Summary", "Follow-up email"].map(
            (tab, index) => (
              <span className={index === 0 ? "is-active" : ""} key={tab}>
                {tab}
              </span>
            ),
          )}
        </div>
        <div className="memory-output-columns">
          {OUTPUT_COLUMNS.map((column) => (
            <article className="memory-output-column" key={column.title}>
              <h3>
                {column.title}
                <span>{column.count}</span>
              </h3>
              <ul>
                {column.items.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/meetings">View all</Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const audioLevel = useLandingAudioLevel();
  const [activeTool, setActiveTool] = useState(0);
  const featuredTool = useMemo(() => TOOL_CARDS[activeTool], [activeTool]);

  return (
    <main className="memory-landing min-h-screen-safe">
      <nav className="memory-nav" aria-label="Primary navigation">
        <Link href="/" className="memory-brand" aria-label="Layers">
          <BrandMark />
          <span>Layers</span>
          <small>by Mirror Factory</small>
        </Link>
        <div className="memory-nav-links">
          <button type="button" className="memory-nav-link">
            Product <ChevronDown size={13} aria-hidden="true" />
          </button>
          <Link href="/download" className="memory-nav-download">
            Download
          </Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up" className="memory-nav-cta">
            Start free
          </Link>
        </div>
      </nav>

      <section className="memory-hero">
        <div className="memory-hero-copy">
          <h1>Turn meetings into structured team memory.</h1>
          <p>
            Record without a meeting bot. Leave with decisions, owners,
            follow-ups, searchable context, and notes your AI tools can use.
          </p>
          <div className="memory-hero-actions">
            <Link href="/sign-up" className="memory-button memory-button-primary">
              Start free
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/pricing"
              className="memory-button memory-button-secondary"
            >
              View pricing
            </Link>
          </div>
        </div>

        <div className="memory-trust-row" aria-label="Product highlights">
          {TRUST_ITEMS.map((item) => (
            <span key={item}>
              <CheckCircle2 size={14} aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>

        <HeroFlow audioLevel={audioLevel} />
      </section>

      <section className="memory-panel memory-tools-panel" aria-labelledby="real-conversations-heading">
        <div className="memory-panel-heading">
          <div>
            <h2 id="real-conversations-heading">
              Connect once. Your meeting memory lives in every AI tool.
            </h2>
            <p>
              Ask questions in tools you already use. Answers come from your
              Layers memory.
            </p>
          </div>
          <span className="memory-selected-tool">
            <IntegrationMark label={featuredTool.mark} tone={featuredTool.tone} />
            {featuredTool.name} is selected
          </span>
        </div>
        <div className="memory-tool-grid">
          {TOOL_CARDS.map((card, index) => (
            <ToolCard
              card={card}
              key={card.id}
              active={index === activeTool}
              onSelect={() => setActiveTool(index)}
            />
          ))}
        </div>
      </section>

      <SearchMemoryPanel />
      <StructuredOutputsPanel />

      <section className="memory-section memory-pricing-section" id="pricing">
        <div className="memory-section-copy">
          <h2>Simple pricing. Start free, scale when you are ready.</h2>
          <p>
            Pricing stays tied to meeting minutes, model cost, and transparent
            usage so the product can scale cleanly.
          </p>
        </div>
        <div className="memory-pricing-grid">
          {PRICING_TIERS.map((tier) => (
            <article
              className={`memory-price-card ${tier.featured ? "is-featured" : ""}`}
              key={tier.name}
            >
              <div>
                <span className="memory-price-name">
                  {tier.name}
                  {tier.featured && <small>Most popular</small>}
                </span>
                <strong>{tier.price}</strong>
                <p>{tier.cadence}</p>
              </div>
              <ul>
                {tier.features.map((feature) => (
                  <li key={feature}>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href={tier.href}>{tier.cta}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="memory-next-section">
        <div className="memory-next-wave" aria-hidden="true">
          <AudioWaveRibbon
            active
            audioLevel={audioLevel * 0.75}
            height={118}
            motion={1.15}
            sensitivity={0.95}
            texture="clean"
          />
        </div>
        <span>Coming next</span>
        <h2>Automate your follow-ups.</h2>
        <p>
          Turn insights into email drafts, updates, reminders, and next steps
          automatically.
        </p>
      </section>

      <footer className="memory-footer">
        <div>
          <BrandMark />
          <span>Layers</span>
        </div>
        <nav aria-label="Footer">
          <Link href="/download">Download</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/account-deletion">Delete account</Link>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up">Start free</Link>
        </nav>
      </footer>
    </main>
  );
}

export default LandingPage;
