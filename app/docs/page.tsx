import { TopBar } from "@/components/top-bar";

export default function DocsPage() {
  return (
    <div className="paper-calm-page min-h-screen-safe flex flex-col">
      <TopBar title="Documentation" showBack />

      <main className="flex-1 px-4 pb-safe py-6 max-w-3xl mx-auto w-full">
        <article className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-[#f5f5f5] mb-3">
              Layers
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Layers captures conversations passively -- no meeting bot
              required -- and uses AI to extract structured, actionable data.
              Not just summaries, but budgets, timelines, decision makers,
              requirements, and pain points.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">
              Getting Started
            </h3>
            <div className="space-y-3">
              <DocStep
                step="1"
                title="Record"
                description="Use the batch recorder to upload audio files, or start a live streaming session for real-time transcription with speaker diarization."
              />
              <DocStep
                step="2"
                title="Review"
                description="Once processing completes, review the AI-generated summary, key points, action items, and intake form extraction."
              />
              <DocStep
                step="3"
                title="Track"
                description="Every meeting shows a transparent cost breakdown -- STT costs, LLM costs, and totals. Monitor your usage on the Usage page."
              />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">
              Features
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FeatureCard
                title="Batch Transcription"
                description="Upload pre-recorded audio files. Supports WebM, MP3, WAV, M4A up to 100MB."
              />
              <FeatureCard
                title="Live Streaming"
                description="Real-time transcription with speaker labels using AssemblyAI's streaming API."
              />
              <FeatureCard
                title="AI Summaries"
                description="Automatic meeting summaries with key points, action items, decisions, and participants."
              />
              <FeatureCard
                title="Intake Extraction"
                description="Structured data extraction: intent, budget, timeline, requirements, pain points, and more."
              />
              <FeatureCard
                title="Cost Transparency"
                description="Per-meeting cost breakdown showing exactly what each API call costs."
              />
              <FeatureCard
                title="Model Selection"
                description="Choose your preferred LLM and speech models. See real pricing for each option."
              />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">
              Platforms
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Layers runs as a web app (Next.js on Vercel), macOS desktop app
              (Tauri 2.x with ScreenCaptureKit for system audio), and iOS mobile
              app (Capacitor 8 WebView) -- all from a single codebase.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3">
              Billing
            </h3>
            <div className="bg-[var(--bg-card)] rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Free</span>
                <span className="text-[var(--text-primary)]">25 meetings lifetime</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Core ($15/mo)</span>
                <span className="text-[var(--text-primary)]">Unlimited meetings</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Pro ($25/mo)</span>
                <span className="text-[var(--text-primary)]">
                  Unlimited + priority features
                </span>
              </div>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}

function DocStep({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-[#134e4a] flex items-center justify-center text-xs font-semibold text-[#14b8a6]">
        {step}
      </div>
      <div>
        <div className="text-sm font-medium text-[var(--text-primary)]">{title}</div>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-3">
      <div className="text-sm font-medium text-[var(--text-primary)] mb-1">{title}</div>
      <p className="text-xs text-[var(--text-muted)] leading-relaxed">{description}</p>
    </div>
  );
}
