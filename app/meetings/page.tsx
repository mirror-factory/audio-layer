import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { MeetingSearch } from "@/components/meeting-search";
import { getMeetingsStore } from "@/lib/meetings/store";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  let meetings: {
    id: string;
    title: string | null;
    status: string;
    durationSeconds: number | null;
    createdAt: string;
  }[] = [];

  try {
    const store = await getMeetingsStore();
    meetings = await store.list(50);
  } catch {
    // best-effort
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <TopBar title="Meetings" showBack />

      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">
        <MeetingSearch />

        {meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-sm text-[var(--text-muted)]">No meetings yet.</p>
            <Link
              href="/"
              className="text-sm text-[#14b8a6] hover:text-[#5eead4] transition-colors duration-200"
            >
              Record your first meeting
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {meetings.map((m) => (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className="flex items-center justify-between glass-card rounded-lg px-4 py-3 transition-all duration-200 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-[var(--text-primary)] truncate group-hover:text-white transition-colors duration-200">
                    {m.title ?? "Untitled recording"}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </span>
                    {m.durationSeconds != null && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {Math.round(m.durationSeconds / 60)} min
                      </span>
                    )}
                  </div>
                </div>
                <StatusChip status={m.status} />
              </Link>
            ))}
          </div>
        )}
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
      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${c.bg} ${c.text}`}
    >
      {status}
    </span>
  );
}
