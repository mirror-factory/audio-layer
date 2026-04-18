"use client";

/**
 * /record/live — AssemblyAI Universal-3 Pro streaming (`u3-rt-pro`).
 *
 * Browser mic only for V1 (no system audio). The desktop Tauri shell
 * will add system-audio capture in a later PR.
 */

import Link from "next/link";
import { LiveRecorder } from "@/components/live-recorder";

export default function RecordLivePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-neutral-950 px-4 pb-20 pt-4 md:px-6 md:pt-6">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-200">
              Live recording
            </h1>
            <p className="text-xs text-neutral-500">
              AssemblyAI Universal-3 Pro streaming over WebSocket. Finalized
              turns stream in as you speak; partial text updates live.
              Browser mic only — Tauri shell will add system audio.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/record"
              className="min-h-[44px] flex items-center text-neutral-500 hover:text-neutral-300"
            >
              Batch mode →
            </Link>
            <Link
              href="/meetings"
              className="min-h-[44px] flex items-center text-neutral-500 hover:text-neutral-300"
            >
              All meetings
            </Link>
            <Link href="/" className="min-h-[44px] flex items-center text-neutral-500 hover:text-neutral-300">
              ← Hub
            </Link>
          </div>
        </header>

        <div className="flex-1">
          <LiveRecorder />
        </div>
      </div>
    </div>
  );
}
