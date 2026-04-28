import Link from "next/link";
import { Calendar, Clock3, PlayCircle, Radio } from "lucide-react";
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

  const completed = meetings.filter((m) => m.status === "completed").length;
  const processing = meetings.filter((m) => m.status === "processing").length;
  const totalMinutes = meetings.reduce(
    (sum, m) => sum + Math.max(0, Math.round((m.durationSeconds ?? 0) / 60)),
    0,
  );

  return (
    <div className="paper-calm-page min-h-screen-safe flex flex-col bg-[var(--bg-primary)]">
      <TopBar title="Meetings" showBack />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-safe py-6">
        <section className="signal-panel mb-4 rounded-lg p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="signal-eyebrow">Meetings</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                Find the right call in seconds.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                Search notes, decisions, and follow-ups without opening every
                recording.
              </p>
            </div>
            <Link
              href="/record/live"
              className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-md bg-[#14b8a6] px-4 text-sm font-semibold text-[#042f2e] transition-colors hover:bg-[#2dd4bf]"
            >
              <Radio size={16} />
              New recording
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-lg border border-[var(--border-card)] bg-black/10">
            <Metric label="saved" value={meetings.length.toString()} />
            <Metric label="complete" value={completed.toString()} />
            <Metric label="minutes" value={totalMinutes.toString()} />
          </div>
        </section>

        <MeetingSearch />

        {meetings.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-card)] bg-[var(--bg-card)] px-5 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#14b8a6]/25 bg-[#14b8a6]/10 text-[#14b8a6]">
              <Radio size={18} />
            </div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              No meetings yet.
            </p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--text-muted)]">
              Record a session and it will show up here with notes, date, and
              duration.
            </p>
            <Link
              href="/record/live"
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-md bg-[#14b8a6] px-4 text-sm font-medium text-[#042f2e] transition-colors duration-200 hover:bg-[#2dd4bf]"
            >
              Record your first meeting
            </Link>
          </div>
        ) : (
          <section className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h2 className="signal-eyebrow">Archive</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {processing > 0
                    ? `${processing} processing, ${completed} complete`
                    : `${completed} complete`}
                </p>
              </div>
            </div>
            <div className="meeting-list overflow-hidden rounded-lg">
              {meetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  className="meeting-row group grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3 px-4 py-3 transition-all duration-200"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-card)] bg-[var(--surface-control)] text-[var(--text-muted)] transition-colors group-hover:border-[#14b8a6]/30 group-hover:text-[#5eead4]">
                    <PlayCircle size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-sm font-medium text-[var(--text-primary)] transition-colors duration-200 group-hover:text-[var(--text-primary)]"
                      title={meetingDisplayTitle(m)}
                    >
                      {meetingDisplayTitle(m)}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <Calendar size={12} />
                        {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                      {m.durationSeconds != null && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                          <Clock3 size={12} />
                          {Math.round(m.durationSeconds / 60)} min
                        </span>
                      )}
                      {meetingInlineStateLabel(m) && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0f9f8a]">
                          {meetingInlineStateLabel(m)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-[var(--border-subtle)] px-4 py-3 last:border-r-0">
      <div className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-medium text-[var(--text-muted)]">
        {label}
      </div>
    </div>
  );
}

function isUntitledRecordingTitle(title: string | null): boolean {
  return !title || title.trim().toLowerCase() === "untitled recording";
}

function meetingDisplayTitle(meeting: {
  title: string | null;
  status: string;
}): string {
  const title = meeting.title?.trim() ?? "";
  const needsGeneratedTitle = isUntitledRecordingTitle(meeting.title);

  if (meeting.status === "processing" && needsGeneratedTitle) {
    return "Writing notes...";
  }
  if (meeting.status === "queued" && needsGeneratedTitle) {
    return "Preparing recording...";
  }
  if (meeting.status === "error" && needsGeneratedTitle) {
    return "Needs attention";
  }

  return title || "Untitled recording";
}

function meetingInlineStateLabel(meeting: {
  title: string | null;
  status: string;
}): string | null {
  if (meeting.status === "completed") return null;
  if (isUntitledRecordingTitle(meeting.title)) return null;

  if (meeting.status === "processing") return "Writing notes";
  if (meeting.status === "queued") return "Preparing";
  if (meeting.status === "error") return "Needs attention";

  return null;
}
