"use client";

import { useState } from "react";
import { Check, Copy, FileText, Loader2, Send } from "lucide-react";

interface MeetingNotesPushPanelProps {
  meetingId: string;
}

interface NotesPackageResponse {
  ready: boolean;
  markdown?: string;
  actionItemCount?: number;
  decisionCount?: number;
  error?: string;
}

export function MeetingNotesPushPanel({
  meetingId,
}: MeetingNotesPushPanelProps) {
  const [includeTranscript, setIncludeTranscript] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "copied" | "manual" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function preparePackage() {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch(`/api/meetings/${meetingId}/notes-package`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          destination: "agent_clipboard",
          trigger: "manual_push",
          include_transcript: includeTranscript,
        }),
      });
      const body = (await response.json()) as NotesPackageResponse;

      if (!response.ok || !body.ready || !body.markdown) {
        throw new Error(body.error ?? "Could not prepare notes package.");
      }

      setMarkdown(body.markdown);

      try {
        await navigator.clipboard.writeText(body.markdown);
        setStatus("copied");
        setMessage(
          `Copied package with ${body.decisionCount ?? 0} decisions and ${body.actionItemCount ?? 0} actions.`,
        );
      } catch {
        setStatus("manual");
        setMessage("Package ready. Copy it below.");
      }
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not prepare notes package.",
      );
    }
  }

  return (
    <section
      aria-label="Copy meeting notes package"
      className="meeting-push-panel rounded-xl border border-[var(--border-card)] bg-[var(--surface-panel)] p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="signal-eyebrow">Use these notes</p>
          <div className="mt-1 flex items-center gap-2">
            <Send size={16} className="text-[#14b8a6]" aria-hidden="true" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Copy a clean package for your AI tools
            </p>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-muted)]">
            Includes summary, key points, decisions, actions, and intake context.
            Nothing is sent to a third party.
          </p>
        </div>

        <button
          type="button"
          onClick={preparePackage}
          disabled={status === "loading"}
          className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--paper-calm-ink)] px-4 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:text-[#042f2e]"
        >
          {status === "loading" ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : status === "copied" ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <Copy size={16} aria-hidden="true" />
          )}
          {status === "copied" ? "Copied" : "Copy package"}
        </button>
      </div>

      <label className="mt-3 flex min-h-[36px] cursor-pointer items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={includeTranscript}
          onChange={(event) => setIncludeTranscript(event.target.checked)}
          className="h-4 w-4 accent-[#14b8a6]"
        />
        Include transcript text
      </label>

      {message && (
        <p
          className={`mt-2 text-xs ${
            status === "error" ? "text-[#ef4444]" : "text-[var(--text-muted)]"
          }`}
          role="status"
        >
          {message}
        </p>
      )}

      {status === "manual" && markdown && (
        <div className="mt-3 rounded-lg border border-[var(--border-card)] bg-[var(--bg-card)] p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
            <FileText size={13} aria-hidden="true" />
            Notes package
          </div>
          <textarea
            readOnly
            value={markdown}
            className="min-h-[180px] w-full resize-y rounded-md border border-[var(--border-card)] bg-[var(--surface-control)] p-3 font-mono text-xs leading-5 text-[var(--text-primary)] focus:outline-none"
          />
        </div>
      )}
    </section>
  );
}
