import Link from "next/link";
import { getMeetingsStore } from "@/lib/meetings/store";
import type { MeetingListItem } from "@/lib/meetings/types";
import { SlideMenuWrapper } from "@/components/slide-menu-wrapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  let items: MeetingListItem[] = [];
  let loadError: string | null = null;
  try {
    items = await (await getMeetingsStore()).list(10);
  } catch (err) {
    loadError = (err as Error).message;
  }

  return (
    <main
      className="min-h-dvh px-4 pb-24 md:px-6"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="mx-auto max-w-2xl">
        {/* Top bar */}
        <header className="flex h-[44px] items-center justify-between">
          <h1
            className="text-[15px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Layer One
          </h1>
          <SlideMenuWrapper />
        </header>

        {/* Start Recording */}
        <Link
          href="/record/live"
          className="mt-6 flex flex-col items-center justify-center rounded-[var(--radius-lg)] py-10"
          style={{
            backgroundColor: "var(--accent-subtle)",
            transition: `background-color var(--duration-fast) var(--ease-out)`,
          }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-inverse)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <span
            className="mt-3 text-[15px] font-semibold"
            style={{ color: "var(--accent)" }}
          >
            Start Recording
          </span>
          <span
            className="mt-1 text-[13px]"
            style={{ color: "var(--text-muted)" }}
          >
            Tap to begin live transcription
          </span>
        </Link>

        {/* Recent meetings */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2
              className="text-label"
              style={{ color: "var(--text-muted)" }}
            >
              Recent Meetings
            </h2>
            <Link
              href="/meetings"
              className="text-[13px] font-medium"
              style={{ color: "var(--accent)" }}
            >
              View all
            </Link>
          </div>

          {loadError ? (
            <div
              role="alert"
              className="mt-4 rounded-[var(--radius-md)] p-4 text-[13px]"
              style={{
                backgroundColor: "var(--bg-secondary)",
                color: "var(--error)",
              }}
            >
              Failed to load meetings: {loadError}
            </div>
          ) : items.length === 0 ? (
            <div
              className="mt-4 rounded-[var(--radius-md)] py-12 text-center text-[13px]"
              style={{
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-muted)",
              }}
            >
              No meetings yet. Record your first one above.
            </div>
          ) : (
            <ul className="mt-4 space-y-1">
              {items.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/meetings/${m.id}`}
                    className="flex min-h-[56px] items-center justify-between rounded-[var(--radius-md)] px-4 py-3"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      transition: `background-color var(--duration-fast) var(--ease-out)`,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-[14px] font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {m.title ?? "Untitled recording"}
                      </p>
                      <p
                        className="mt-0.5 text-[12px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatDate(m.createdAt)}
                        {typeof m.durationSeconds === "number"
                          ? ` \u00b7 ${formatDuration(m.durationSeconds)}`
                          : ""}
                      </p>
                    </div>
                    <StatusChip status={m.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Floating action button */}
      <Link
        href="/record/live"
        className="fixed bottom-6 left-1/2 z-50 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full shadow-lg"
        style={{
          backgroundColor: "var(--accent)",
          marginBottom: "env(safe-area-inset-bottom)",
        }}
        aria-label="Start recording"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-inverse)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      </Link>
    </main>
  );
}

function StatusChip({ status }: { status: MeetingListItem["status"] }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    completed: { bg: "var(--success)", text: "var(--text-inverse)" },
    error: { bg: "var(--error)", text: "var(--text-inverse)" },
    processing: { bg: "var(--warning)", text: "var(--text-inverse)" },
    queued: { bg: "var(--text-muted)", text: "var(--text-inverse)" },
  };
  const colors = colorMap[status] ?? colorMap.queued;

  return (
    <span
      className="ml-3 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{
        backgroundColor: `color-mix(in oklch, ${colors.bg} 20%, transparent)`,
        color: colors.bg,
      }}
    >
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
