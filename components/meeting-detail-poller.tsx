"use client";

/**
 * Client-side poller for /meetings/[id] when the meeting is still
 * processing. Hits /api/transcribe/[id] so that completion side-effects
 * (summary generation + persistence) fire. When the server reports
 * terminal status, we refresh the route segment to re-render with the
 * final data.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

export function MeetingDetailPoller({ id }: { id: string }) {
  const router = useRouter();
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    const start = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (stoppedRef.current) return;
      if (Date.now() - start > POLL_TIMEOUT_MS) return;
      try {
        const res = await fetch(`/api/transcribe/${id}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { status: string };
          if (data.status === "completed" || data.status === "error") {
            router.refresh();
            return;
          }
        }
      } catch {
        // transient — keep polling
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    tick();

    return () => {
      stoppedRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, router]);

  return (
    <div
      aria-live="polite"
      className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-300"
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400"
      />
      Transcribing with AssemblyAI Universal-3 Pro…
    </div>
  );
}
