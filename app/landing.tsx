"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Mic,
  FileText,
  Brain,
  DollarSign,
  Shield,
  Smartphone,
  Square,
  Circle,
} from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";

/* ─────────────────────────── Constants ─────────────────────────── */

const DEMO_TRANSCRIPT_LINES = [
  {
    speaker: "Sarah",
    text: "Alright, let's kick off. Q3 campaign budget is $240K — we need to allocate across paid, organic, and events.",
  },
  {
    speaker: "Marcus",
    text: "Paid social should get at least 40%. The LinkedIn retargeting campaign from Q2 had a 3.2x ROAS.",
  },
  {
    speaker: "Sarah",
    text: "Agreed. What about the product launch? We're targeting September 15th for the reveal.",
  },
  {
    speaker: "Priya",
    text: "I'd recommend $35K for the launch event. That covers venue, streaming, and influencer partnerships.",
  },
  {
    speaker: "Marcus",
    text: "Let's also carve out $20K for A/B testing on the new landing pages. We need data before scaling.",
  },
  {
    speaker: "Sarah",
    text: "Good call. Priya, can you own the event timeline? Deliverables by end of next week.",
  },
  {
    speaker: "Priya",
    text: "On it. I'll loop in the design team for the campaign assets too.",
  },
];

const DEMO_SUMMARY = {
  title: "Q3 Marketing Campaign Planning",
  decisions: [
    "40% of $240K budget allocated to paid social",
    "Product launch date set for September 15th",
    "$35K approved for launch event",
    "$20K reserved for A/B testing",
  ],
  actionItems: [
    { owner: "Priya", task: "Event timeline deliverables by EOW" },
    { owner: "Priya", task: "Coordinate with design team on assets" },
    { owner: "Marcus", task: "Prepare LinkedIn retargeting brief" },
  ],
};

const FEATURES = [
  {
    icon: Brain,
    title: "Structured extraction",
    desc: "Budgets, timelines, decision makers, action items — not just summaries. Every conversation becomes structured, actionable data.",
  },
  {
    icon: Mic,
    title: "Live transcription",
    desc: "Real-time streaming with speaker diarization. No bot in your meeting.",
  },
  {
    icon: FileText,
    title: "Intake forms",
    desc: "Every conversation auto-generates CRM-ready structured data.",
  },
  {
    icon: DollarSign,
    title: "Cost transparency",
    desc: "See exactly what each meeting costs. Pick your own AI model.",
  },
  {
    icon: Shield,
    title: "Your data, your models",
    desc: "Choose from 9 LLMs and 5 speech models. Zero vendor lock-in.",
  },
  {
    icon: Smartphone,
    title: "Multi-platform",
    desc: "Web, macOS desktop, and iOS — one codebase, instant updates.",
  },
];

/* ─────────────────────────── Demo Hook ─────────────────────────── */

type DemoPhase = "waiting" | "recording" | "summarizing" | "summary";

function useRecordingDemo() {
  const [phase, setPhase] = useState<DemoPhase>("waiting");
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [demoAudioLevel, setDemoAudioLevel] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startDemo = useCallback(() => {
    setPhase("recording");
    setVisibleLines(0);
    setElapsedSeconds(0);

    // Simulate audio levels with sinusoidal cycling
    let audioT = 0;
    audioTimerRef.current = setInterval(() => {
      audioT += 0.15;
      setDemoAudioLevel(
        0.3 + 0.4 * Math.abs(Math.sin(audioT)) + 0.2 * Math.random(),
      );
    }, 80);

    // Timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    // Stream transcript lines
    DEMO_TRANSCRIPT_LINES.forEach((_, i) => {
      setTimeout(
        () => {
          setVisibleLines(i + 1);
        },
        1200 * (i + 1),
      );
    });

    // After all lines, transition to summarizing then summary
    const totalTime = 1200 * (DEMO_TRANSCRIPT_LINES.length + 1);
    setTimeout(() => {
      setPhase("summarizing");
      setDemoAudioLevel(0);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    }, totalTime);

    setTimeout(() => {
      setPhase("summary");
    }, totalTime + 2500);
  }, []);

  // Auto-start and loop
  useEffect(() => {
    const startTimeout = setTimeout(startDemo, 1500);
    return () => {
      clearTimeout(startTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    };
  }, [startDemo]);

  // Loop: restart after summary is shown
  useEffect(() => {
    if (phase !== "summary") return;
    const restartTimeout = setTimeout(() => {
      startDemo();
    }, 6000);
    return () => clearTimeout(restartTimeout);
  }, [phase, startDemo]);

  return { phase, visibleLines, elapsedSeconds, demoAudioLevel };
}

/* ─────────────────────────── Hero Shader Cycling ─────────────────────────── */

function useHeroShaderCycle() {
  const [heroAudio, setHeroAudio] = useState(0);

  useEffect(() => {
    // Always show the 3 colored lines with gentle organic movement
    let t = 0;
    const timer = setInterval(() => {
      t += 0.08;
      setHeroAudio(
        0.25 + 0.35 * Math.abs(Math.sin(t)) + 0.1 * Math.sin(t * 2.3),
      );
    }, 60);

    return () => clearInterval(timer);
  }, []);

  // Always "recording" state so all 3 lines show with color
  return { heroState: "recording" as const, heroAudio };
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ─────────────────────────── Component ─────────────────────────── */

export function LandingPage() {
  const { heroState, heroAudio } = useHeroShaderCycle();
  const { phase, visibleLines, elapsedSeconds, demoAudioLevel } =
    useRecordingDemo();

  const demoShaderState =
    phase === "recording"
      ? "recording"
      : phase === "summarizing"
        ? "summarizing"
        : "idle";

  return (
    <div className="landing-shell min-h-screen-safe bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* ───── Top Navigation ───── */}
      <nav
        className="landing-nav fixed left-0 right-0 top-0 z-50"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <div className="landing-nav-inner mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
          <Link href="/" className="landing-brand text-[var(--text-primary)]">
            <span>Layer One</span>
          </Link>
          <div className="landing-nav-actions flex items-center gap-2">
            <Link
              href="/sign-in"
              className="landing-nav-link text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="landing-nav-button text-sm font-medium transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ───── SECTION 1: Hero ───── */}
      <section className="landing-hero relative overflow-hidden px-4">
        <div className="landing-hero-wave" aria-hidden="true">
          <WebGLShader
            state={heroState}
            audioLevel={heroAudio}
            className="w-full h-full"
          />
        </div>
        <div className="landing-hero-content relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="landing-hero-kicker">Layer One by Mirror Factory</p>
          <h1 className="landing-hero-title text-[var(--text-primary)]">
            Meeting intake, instantly.
          </h1>
          <p className="landing-hero-copy text-[var(--text-secondary)]">
            Record once. Leave with clean notes, decisions, next steps, and the
            context your team needs to act.
          </p>

          <div className="landing-hero-actions">
            <Link
              href="/sign-up"
              className="landing-button landing-button-primary"
            >
              <span>Start free</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/sign-in"
              className="landing-button landing-button-secondary"
            >
              Sign in
            </Link>
          </div>

          <div className="landing-trust-row" aria-label="Product highlights">
            {["25 meetings free", "No meeting bot", "Action-ready notes"].map(
              (item) => (
                <span key={item}>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  {item}
                </span>
              ),
            )}
          </div>

          <div
            className="landing-capture-dock"
            aria-label="Live meeting capture preview"
          >
            <div className="landing-capture-top">
              <span>Live capture</span>
              <span>Ready in seconds</span>
            </div>
            <div className="landing-capture-main">
              <span className="landing-record-button" aria-hidden="true">
                <Mic size={22} />
              </span>
              <div className="landing-capture-text">
                <strong>Start meeting</strong>
                <span>Capture notes without inviting a bot.</span>
              </div>
              <span className="landing-capture-time">00:00</span>
            </div>
            <div className="landing-capture-lanes">
              <span>Notes</span>
              <span>Decisions</span>
              <span>Intake</span>
            </div>
          </div>
        </div>
      </section>

      {/* ───── SECTION 2: Features (Bento Grid) ───── */}
      <section className="px-4 py-24 max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-[var(--text-primary)]">
          Built for real conversations
        </h2>
        <p className="text-sm text-[var(--text-muted)] text-center mb-14 max-w-md mx-auto">
          Everything you need to capture, understand, and act on meetings.
        </p>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group p-7 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] hover:border-[var(--border-subtle)] transition-all duration-300 hover:bg-[var(--bg-card-hover)]"
            >
              <div className="w-11 h-11 rounded-xl bg-[#14b8a6]/10 flex items-center justify-center mb-5 group-hover:bg-[#14b8a6]/20 transition-colors duration-300">
                <f.icon
                  size={22}
                  className="text-[#14b8a6]"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-base font-semibold mb-2 text-[var(--text-primary)]">
                {f.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── SECTION 3: Interactive Demo ───── */}
      <section className="px-4 py-24 max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-[var(--text-primary)]">
          See it in action
        </h2>
        <p className="text-sm text-[var(--text-muted)] text-center mb-12">
          Watch Layer One capture and analyze a real meeting in seconds.
        </p>

        {/* Demo container — glass card */}
        <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] backdrop-blur-sm overflow-hidden">
          {/* Recorder chrome */}
          {(phase === "recording" || phase === "waiting") && (
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-card)]">
              {/* Left: stop button */}
              <div className="flex items-center gap-3">
                <button
                  className="w-8 h-8 rounded-lg bg-[var(--bg-card-hover)] flex items-center justify-center"
                  aria-label="Stop"
                >
                  <Square
                    size={12}
                    className="text-[var(--text-primary)]"
                    fill="currentColor"
                  />
                </button>
              </div>
              {/* Center: timer + RECORDING */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-[var(--text-primary)]">
                  {formatTime(elapsedSeconds)}
                </span>
                {phase === "recording" && (
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-medium">
                    Recording
                  </span>
                )}
              </div>
              {/* Right: LIVE indicator */}
              <div className="flex items-center gap-1.5">
                {phase === "recording" && (
                  <>
                    <Circle
                      size={7}
                      className="text-red-500 animate-pulse"
                      fill="currentColor"
                    />
                    <span className="text-[10px] text-red-400 uppercase tracking-wider font-medium">
                      Live
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Shader in demo */}
          {(phase === "recording" || phase === "waiting") && (
            <div className="w-full" style={{ height: 80 }}>
              <WebGLShader
                state={demoShaderState}
                audioLevel={demoAudioLevel}
                className="w-full h-full"
              />
            </div>
          )}

          {/* Transcript streaming */}
          {phase === "recording" && visibleLines > 0 && (
            <div
              className="px-5 py-4 space-y-3 overflow-y-auto"
              style={{ scrollbarWidth: "none" }}
            >
              {DEMO_TRANSCRIPT_LINES.slice(0, visibleLines).map((line, i) => (
                <div
                  key={i}
                  className="animate-[fadeSlideIn_0.4s_ease-out_both]"
                >
                  <span className="text-xs font-semibold text-[#14b8a6] mr-2">
                    {line.speaker}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {line.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Summarizing transition */}
          {phase === "summarizing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 animate-[fadeSlideIn_0.4s_ease-out_both]">
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] animate-pulse"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] animate-pulse"
                  style={{ animationDelay: "200ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] animate-pulse"
                  style={{ animationDelay: "400ms" }}
                />
              </div>
              <p className="text-sm text-white/50">Summarizing your notes...</p>
            </div>
          )}

          {/* Summary result */}
          {phase === "summary" && (
            <div className="px-5 py-5 space-y-5 animate-[fadeSlideIn_0.5s_ease-out_both]">
              <div>
                <h3 className="text-base font-semibold mb-1 text-[var(--text-primary)]">
                  {DEMO_SUMMARY.title}
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                  7 transcript lines &middot; 3 speakers &middot; 0:08 duration
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[#14b8a6] uppercase tracking-wider mb-2">
                  Key Decisions
                </h4>
                <ul className="space-y-1.5">
                  {DEMO_SUMMARY.decisions.map((d, i) => (
                    <li
                      key={i}
                      className="text-sm text-[var(--text-secondary)] flex items-start gap-2"
                    >
                      <span className="text-[#14b8a6] mt-1 shrink-0">
                        &bull;
                      </span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[#14b8a6] uppercase tracking-wider mb-2">
                  Action Items
                </h4>
                <ul className="space-y-1.5">
                  {DEMO_SUMMARY.actionItems.map((a, i) => (
                    <li
                      key={i}
                      className="text-sm text-[var(--text-secondary)] flex items-start gap-2"
                    >
                      <span className="text-[#14b8a6] mt-1 shrink-0">
                        &bull;
                      </span>
                      <span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {a.owner}:
                        </span>{" "}
                        {a.task}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ───── SECTION 4: Pricing ───── */}
      <section
        id="pricing"
        className="px-4 py-24 max-w-4xl mx-auto text-center"
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-[var(--text-primary)]">
          Simple pricing
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-14 max-w-sm mx-auto">
          Start free. Upgrade when you need more.
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {/* Free */}
          <div className="p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] hover:border-[var(--border-subtle)] transition-all duration-300">
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 font-medium">
              Free
            </div>
            <div className="text-4xl font-bold mb-1 text-[var(--text-primary)]">
              $0
            </div>
            <div className="text-xs text-[var(--text-muted)] mb-6">/month</div>
            <div className="text-sm text-[var(--text-secondary)] font-medium">
              25 meetings
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-2">
              All features included
            </div>
          </div>

          {/* Core — highlighted */}
          <div className="p-8 rounded-2xl bg-[var(--bg-card)] border border-[#14b8a6]/30 hover:border-[#14b8a6]/50 transition-all duration-300 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#14b8a6] text-white text-[10px] font-semibold uppercase tracking-wider rounded-full">
              Popular
            </div>
            <div className="text-xs text-[#14b8a6] uppercase tracking-wider mb-3 font-medium">
              Core
            </div>
            <div className="text-4xl font-bold mb-1 text-[var(--text-primary)]">
              $15
              <span className="text-sm font-normal text-[var(--text-muted)] ml-1">
                /mo
              </span>
            </div>
            <div className="text-xs text-[var(--text-muted)] mb-6">
              billed monthly
            </div>
            <div className="text-sm text-[var(--text-secondary)] font-medium">
              Unlimited meetings
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-2">
              Priority processing
            </div>
          </div>

          {/* Pro */}
          <div className="p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] hover:border-[var(--border-subtle)] transition-all duration-300">
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 font-medium">
              Pro
            </div>
            <div className="text-4xl font-bold mb-1 text-[var(--text-primary)]">
              $25
              <span className="text-sm font-normal text-[var(--text-muted)] ml-1">
                /mo
              </span>
            </div>
            <div className="text-xs text-[var(--text-muted)] mb-6">
              billed monthly
            </div>
            <div className="text-sm text-[var(--text-secondary)] font-medium">
              Unlimited + priority
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-2">
              Team features &amp; API access
            </div>
          </div>
        </div>
      </section>

      {/* ───── SECTION 5: Footer ───── */}
      <footer className="px-4 py-16 border-t border-[var(--border-subtle)]">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center sm:items-start gap-2">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Layer One Audio
              </span>
              <p className="text-xs text-[var(--text-muted)]">
                A{" "}
                <a
                  href="https://mirrorfactory.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors underline underline-offset-2"
                >
                  Mirror Factory
                </a>{" "}
                product
              </p>
            </div>
            <div className="flex items-center gap-8">
              <Link
                href="/sign-up"
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Sign up
              </Link>
              <Link
                href="/sign-in"
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Sign in
              </Link>
              <a
                href="#pricing"
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Pricing
              </a>
              <a
                href="https://mirrorfactory.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                mirrorfactory.ai
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Keyframe animation for transcript lines */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
