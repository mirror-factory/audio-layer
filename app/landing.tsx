"use client";

import Link from "next/link";
import { Mic, FileText, Brain, DollarSign, Shield, Smartphone } from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Hero with shader */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-4">
        {/* Shader background — full width behind hero */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ height: 200 }}>
            <WebGLShader state="idle" className="w-full h-full" />
          </div>
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
            Layer One
          </h1>
          <p className="text-lg sm:text-xl text-[var(--text-muted)] mb-2 max-w-lg mx-auto leading-relaxed">
            Audio intelligence for conversations that matter.
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-10 max-w-md mx-auto opacity-60">
            Capture, transcribe, and extract structured data — budgets, timelines, decisions, action items — not just summaries.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="px-8 py-3 bg-[#14b8a6] hover:bg-[#0d9488] text-white font-medium rounded-full transition-all duration-300 hover:shadow-[0_0_30px_rgba(20,184,166,0.2)]"
            >
              Get started free
            </Link>
            <Link
              href="/sign-in"
              className="px-8 py-3 border border-white/10 hover:border-white/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full transition-all duration-300"
            >
              Sign in
            </Link>
          </div>

          <p className="text-xs text-[var(--text-muted)] mt-4 opacity-40">
            25 meetings free. No credit card required.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 max-w-4xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <f.icon size={20} className="text-[#14b8a6] mb-3" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-10">How it works</h2>
        <div className="flex flex-col gap-8">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-4 text-left">
              <span className="shrink-0 w-8 h-8 rounded-full bg-[#14b8a6]/10 text-[#14b8a6] flex items-center justify-center text-sm font-semibold">
                {i + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section className="px-4 py-16 max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-3">Simple pricing</h2>
        <p className="text-sm text-[var(--text-muted)] mb-8">Start free. Upgrade when you need more.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Free</div>
            <div className="text-2xl font-bold mb-2">$0</div>
            <div className="text-xs text-[var(--text-muted)]">25 meetings</div>
          </div>
          <div className="p-5 rounded-xl bg-white/[0.02] border border-[#14b8a6]/20">
            <div className="text-xs text-[#14b8a6] uppercase tracking-wider mb-1">Core</div>
            <div className="text-2xl font-bold mb-2">$15<span className="text-sm font-normal text-[var(--text-muted)]">/mo</span></div>
            <div className="text-xs text-[var(--text-muted)]">Unlimited</div>
          </div>
          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Pro</div>
            <div className="text-2xl font-bold mb-2">$25<span className="text-sm font-normal text-[var(--text-muted)]">/mo</span></div>
            <div className="text-xs text-[var(--text-muted)]">Unlimited + priority</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-10 border-t border-white/[0.04] text-center">
        <p className="text-xs text-[var(--text-muted)] opacity-40">
          Layer One Audio &middot; Mirror Factory
        </p>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: Mic,
    title: "Live transcription",
    desc: "Real-time streaming with speaker diarization. No bot in your meeting.",
  },
  {
    icon: Brain,
    title: "Structured extraction",
    desc: "Budgets, timelines, decision makers, requirements, pain points — not just summaries.",
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

const STEPS = [
  {
    title: "Tap and record",
    desc: "One tap starts live transcription. Speak naturally — no meeting bot, no app switching.",
  },
  {
    title: "AI extracts what matters",
    desc: "Summary, key points, action items, decisions, and structured intake data — all generated automatically.",
  },
  {
    title: "Review and act",
    desc: "Browse your meetings, export as PDF or Markdown, and track costs per meeting.",
  },
];
