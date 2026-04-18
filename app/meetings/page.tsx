/**
 * /meetings — recent meetings list.
 *
 * Server-rendered from the MeetingsStore. When Supabase isn't
 * configured, reads from the in-memory store in the current process
 * (dev only).
 */

import Link from "next/link";
import { getMeetingsStore } from "@/lib/meetings/store";
import type { MeetingListItem } from "@/lib/meetings/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  let items: MeetingListItem[] = [];
  let loadError: string | null = null;
  try {
    items = await (await getMeetingsStore()).list(50);
  } catch (err) {
    loadError = (err as Error).message;
  }

  return (
    <div className="min-h-dvh bg-neutral-950 px-4 pb-20 pt-4 md:px-6 md:pt-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-200">Meetings</h1>
            <p className="text-xs text-neutral-500">
              Recent recordings stored in the MeetingsStore. Each row is
              clickable.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/record"
              className="min-h-[44px] flex items-center rounded-md border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-emerald-200 hover:bg-emerald-900/50"
            >
              + New recording
            </Link>
            <Link
              href="/"
              className="min-h-[44px] flex items-center text-neutral-500 hover:text-neutral-300"
            >
              ← Hub
            </Link>
          </div>
        </header>

        {loadError ? (
          <div
            role="alert"
            className="rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-300"
          >
            Failed to load meetings: {loadError}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/30 p-8 text-center text-sm text-neutral-500">
            No meetings yet.{" "}
            <Link
              href="/record"
              className="text-emerald-400 underline-offset-2 hover:underline"
            >
              Record or upload your first one
            </Link>
            .
          </div>
        ) : (
          <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900/40">
            {items.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/meetings/${m.id}`}
                  className="flex min-h-[48px] w-full items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-800/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-100">
                      {m.title ?? "Untitled recording"}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {formatDate(m.createdAt)}
                      {typeof m.durationSeconds === "number"
                        ? ` · ${formatDuration(m.durationSeconds)}`
                        : ""}
                    </p>
                  </div>
                  <StatusChip status={m.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusChip({
  status,
}: {
  status: MeetingListItem["status"];
}) {
  const cls =
    status === "completed"
      ? "border-emerald-800 bg-emerald-900/30 text-emerald-300"
      : status === "error"
        ? "border-red-800 bg-red-900/30 text-red-300"
        : "border-amber-800 bg-amber-900/30 text-amber-300";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}
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
