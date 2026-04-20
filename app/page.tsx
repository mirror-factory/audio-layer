import Link from "next/link";
import {
  Mic,
  Radio,
  List,
  MessageSquare,
  Settings,
  CreditCard,
  BarChart3,
  User,
} from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { getMeetingsStore } from "@/lib/meetings/store";

const NAV_GRID = [
  { href: "/record", label: "Record", desc: "Batch upload", icon: Mic },
  { href: "/record/live", label: "Live", desc: "Stream transcription", icon: Radio },
  { href: "/meetings", label: "Meetings", desc: "Browse all", icon: List },
  { href: "/chat", label: "Chat", desc: "AI assistant", icon: MessageSquare },
  { href: "/settings", label: "Settings", desc: "Model prefs", icon: Settings },
  { href: "/pricing", label: "Pricing", desc: "Plans & billing", icon: CreditCard },
  { href: "/usage", label: "Usage", desc: "Cost tracking", icon: BarChart3 },
  { href: "/profile", label: "Profile", desc: "Account", icon: User },
];

export default async function HomePage() {
  let recentMeetings: { id: string; title: string | null; status: string; createdAt: string }[] = [];

  try {
    const store = await getMeetingsStore();
    const meetings = await store.list(5);
    recentMeetings = meetings.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      createdAt: m.createdAt,
    }));
  } catch {
    // best-effort
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar title="Layer One" />

      <main className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-[#f5f5f5] mb-2">
            Layer One
          </h1>
          <p className="text-sm text-[#a3a3a3] leading-relaxed max-w-md">
            Capture conversations passively. Extract structured, actionable data
            -- not just summaries.
          </p>
        </div>

        {/* Start Recording CTA */}
        <Link
          href="/record/live"
          className="flex items-center justify-center gap-3 w-full py-4 mb-10 bg-[#14b8a6] hover:bg-[#0d9488] text-white font-semibold rounded-xl transition-colors duration-200 min-h-[44px]"
        >
          <Radio size={20} />
          Start Recording
        </Link>

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {NAV_GRID.map(({ href, label, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 bg-[#171717] hover:bg-[#262626] rounded-xl p-4 min-h-[44px] transition-colors duration-200"
            >
              <Icon size={22} className="text-[#14b8a6]" />
              <span className="text-xs font-semibold text-[#e5e5e5]">
                {label}
              </span>
              <span className="text-[10px] text-[#525252]">{desc}</span>
            </Link>
          ))}
        </div>

        {/* Recent Meetings */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#e5e5e5] uppercase tracking-wider">
              Recent Meetings
            </h2>
            <Link
              href="/meetings"
              className="text-xs text-[#14b8a6] hover:underline"
            >
              View all
            </Link>
          </div>

          {recentMeetings.length === 0 ? (
            <div className="bg-[#171717] rounded-xl p-6 text-center">
              <p className="text-sm text-[#525252]">
                No meetings yet. Start a recording to begin.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentMeetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  className="flex items-center justify-between bg-[#171717] hover:bg-[#262626] rounded-lg px-4 py-3 transition-colors duration-200"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-[#d4d4d4] truncate">
                      {m.title ?? "Untitled recording"}
                    </div>
                    <div className="text-xs text-[#525252] mt-0.5">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <StatusChip status={m.status} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    completed: { bg: "bg-[#22c55e]/10", text: "text-[#22c55e]" },
    processing: { bg: "bg-[#14b8a6]/10", text: "text-[#14b8a6]" },
    queued: { bg: "bg-[#eab308]/10", text: "text-[#eab308]" },
    error: { bg: "bg-[#ef4444]/10", text: "text-[#ef4444]" },
  };
  const c = config[status] ?? config.processing;

  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${c.bg} ${c.text}`}
    >
      {status}
    </span>
  );
}
