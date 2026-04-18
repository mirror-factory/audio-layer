"use client";

/**
 * /record — upload an audio file or record from the browser mic, then
 * poll /api/transcribe/[id] until the transcript + summary are ready.
 *
 * This is the V1 batch pipeline. Streaming (u3-rt-pro) + native desktop
 * system-audio capture come in a later PR.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AudioRecorder } from "@/components/audio-recorder";
import type {
  TranscribeResultResponse,
  TranscribeStartResponse,
} from "@/lib/assemblyai/types";

type UiStage = "idle" | "uploading" | "processing" | "error";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export default function RecordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<UiStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const reset = () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setStage("idle");
    setError(null);
    setProgress("");
  };

  const startTranscription = async (blob: Blob, filename: string) => {
    setStage("uploading");
    setError(null);
    setProgress("Uploading to AssemblyAI…");

    const form = new FormData();
    form.append("audio", blob, filename);

    let id: string;
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });
      if (res.status === 402) {
        // Free-tier limit hit — surface the upgrade CTA inline.
        const data = await res
          .json()
          .catch(() => ({ error: "Free-tier limit reached." }));
        setError(
          `${data.error ?? "Free-tier limit reached."} Open /pricing to subscribe.`,
        );
        setStage("error");
        return;
      }
      if (!res.ok) {
        const msg = await safeErrorMessage(res);
        throw new Error(msg);
      }
      const start = (await res.json()) as TranscribeStartResponse;
      id = start.id;
    } catch (err) {
      setError((err as Error).message);
      setStage("error");
      return;
    }

    setStage("processing");
    setProgress("Transcribing with Universal-3 Pro…");
    const startedAt = Date.now();

    const poll = async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setError("Timed out waiting for transcription to complete.");
        setStage("error");
        return;
      }
      try {
        const res = await fetch(`/api/transcribe/${id}`);
        if (!res.ok) {
          const msg = await safeErrorMessage(res);
          throw new Error(msg);
        }
        const data = (await res.json()) as TranscribeResultResponse;
        if (data.status === "completed") {
          // Persistence already happened server-side during this GET.
          // Hand off to the detail page.
          router.push(`/meetings/${id}`);
          return;
        }
        if (data.status === "error") {
          setError(data.error ?? "Transcription failed.");
          setStage("error");
          return;
        }
        setProgress(
          data.status === "queued"
            ? "Queued…"
            : "Transcribing with Universal-3 Pro…",
        );
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        setError((err as Error).message);
        setStage("error");
      }
    };

    poll();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    startTranscription(file, file.name);
  };

  const onRecorded = (blob: Blob) => {
    const ext =
      blob.type.includes("mp4") ? "mp4" :
      blob.type.includes("ogg") ? "ogg" :
      "webm";
    startTranscription(blob, `recording.${ext}`);
  };

  const busy = stage === "uploading" || stage === "processing";

  return (
    <div className="min-h-dvh bg-neutral-950 px-4 pb-20 pt-4 md:px-6 md:pt-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-200">Record</h1>
            <p className="text-xs text-neutral-500">
              Upload an audio file or record from your mic. AssemblyAI
              Universal-3 Pro handles transcription; the Gateway generates the
              summary.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/record/live"
              className="min-h-[44px] rounded-md border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 flex items-center text-emerald-200 hover:bg-emerald-900/50"
            >
              Live mode
            </Link>
            <Link
              href="/meetings"
              className="min-h-[44px] flex items-center text-neutral-500 hover:text-neutral-300"
            >
              All meetings
            </Link>
            <Link
              href="/"
              className="min-h-[44px] flex items-center text-neutral-500 hover:text-neutral-300"
            >
              ← Hub
            </Link>
          </div>
        </header>

        <section
          aria-label="Input"
          className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <AudioRecorder disabled={busy} onRecorded={onRecorded} />
            <div className="text-xs text-neutral-600">or</div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300 hover:text-neutral-100">
              <span className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 hover:bg-neutral-800">
                Upload audio file
              </span>
              <input
                type="file"
                accept="audio/*,video/*"
                onChange={onFileChange}
                disabled={busy}
                className="sr-only"
                data-testid="audio-file-input"
              />
            </label>
            {stage !== "idle" ? (
              <button
                type="button"
                onClick={reset}
                className="ml-auto text-xs text-neutral-500 hover:text-neutral-300"
              >
                Reset
              </button>
            ) : null}
          </div>
        </section>

        {busy ? (
          <section
            aria-live="polite"
            className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-300"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400"
              />
              {progress}
            </div>
          </section>
        ) : null}

        {stage === "error" && error ? (
          <section
            role="alert"
            className="rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-300"
          >
            {error}
          </section>
        ) : null}

      </div>
    </div>
  );
}

async function safeErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? `Request failed with status ${res.status}`;
  } catch {
    return `Request failed with status ${res.status}`;
  }
}
