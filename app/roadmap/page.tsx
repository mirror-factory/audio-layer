import { TopBar } from "@/components/top-bar";

const ROADMAP = {
  now: [
    "Live streaming transcription with speaker diarization",
    "AI summary + structured intake extraction",
    "Per-meeting cost transparency",
    "Multi-model selection (9 LLMs + 5 STT models)",
  ],
  next: [
    "Organization/team workspaces with shared meeting notes",
    "Meeting search and filtering",
    "Meeting detail chat (query transcripts with AI)",
    "PDF/Markdown export improvements",
  ],
  later: [
    "Auto-detect meetings on macOS (watch for Zoom/Meet/Teams)",
    "CRM integration (HubSpot/Salesforce push)",
    "Custom vocabulary training",
    "Windows desktop app",
    "Android native app",
  ],
};

export default function RoadmapPage() {
  return (
    <div className="paper-calm-page min-h-screen-safe flex flex-col bg-[var(--bg-primary)]">
      <TopBar title="Roadmap" showBack />

      <main className="flex-1 px-4 pb-safe py-8 max-w-2xl mx-auto w-full space-y-8">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
            Product Roadmap
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            What we&apos;re building and where we&apos;re headed
          </p>
        </div>

        <RoadmapSection
          title="Now"
          subtitle="Shipped and available"
          items={ROADMAP.now}
          accentColor="#14b8a6"
        />
        <RoadmapSection
          title="Next"
          subtitle="In development"
          items={ROADMAP.next}
          accentColor="#f59e0b"
        />
        <RoadmapSection
          title="Later"
          subtitle="Planned"
          items={ROADMAP.later}
          accentColor="#6366f1"
        />
      </main>
    </div>
  );
}

function RoadmapSection({
  title,
  subtitle,
  items,
  accentColor,
}: {
  title: string;
  subtitle: string;
  items: string[];
  accentColor: string;
}) {
  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
          <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
        </div>
      </div>
      <ul className="space-y-2.5 pl-5">
        {items.map((item, i) => (
          <li
            key={i}
            className="text-sm text-[var(--text-secondary)] relative before:absolute before:left-[-12px] before:top-[8px] before:w-1 before:h-1 before:rounded-full before:bg-[var(--text-muted)]"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
