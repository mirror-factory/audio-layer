/**
 * /settings — pick AssemblyAI and LLM models.
 *
 * Client component that reads/writes via /api/settings. Preferences
 * are stored in a cookie so they persist without Supabase.
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ModelSettings } from "@/lib/settings-shared";
import { MODEL_OPTIONS } from "@/lib/settings-shared";

type Status = "idle" | "saving" | "saved" | "error";

export default function SettingsPage() {
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => setStatus("error"));
  }, []);

  async function save(patch: Partial<ModelSettings>) {
    setStatus("saving");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json();
      setSettings(updated);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  if (!settings) {
    return (
      <Shell>
        <p className="text-sm text-neutral-400">Loading settings…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <section className="space-y-5">
        <SectionHeader
          title="Summarization model"
          description="LLM used for meeting summaries and intake form extraction. Routed through the Vercel AI Gateway."
        />
        <Select
          value={settings.summaryModel}
          options={MODEL_OPTIONS.summary}
          onChange={(v) => save({ summaryModel: v })}
        />
      </section>

      <hr className="border-neutral-800" />

      <section className="space-y-5">
        <SectionHeader
          title="Transcription — pre-recorded"
          description="AssemblyAI model for batch uploads via /record. Higher quality models cost more per hour of audio."
        />
        <Select
          value={settings.batchSpeechModel}
          options={MODEL_OPTIONS.batchSpeech}
          onChange={(v) => save({ batchSpeechModel: v })}
        />
      </section>

      <hr className="border-neutral-800" />

      <section className="space-y-5">
        <SectionHeader
          title="Transcription — real-time"
          description="AssemblyAI streaming model for live recording via /record/live. Determines latency and accuracy of real-time captions."
        />
        <Select
          value={settings.streamingSpeechModel}
          options={MODEL_OPTIONS.streamingSpeech}
          onChange={(v) => save({ streamingSpeechModel: v })}
        />
      </section>

      <StatusBadge status={status} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-neutral-950 px-4 py-10 md:px-6">
      <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-100">Settings</h1>
          <Link
            href="/"
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            ← Hub
          </Link>
        </header>
        {children}
      </div>
    </main>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-200">{title}</h2>
      <p className="mt-1 text-xs text-neutral-500">{description}</p>
    </div>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-blue-500"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "idle") return null;
  const styles = {
    saving: "text-neutral-400",
    saved: "text-emerald-400",
    error: "text-red-400",
  };
  const labels = {
    saving: "Saving…",
    saved: "Saved",
    error: "Failed to save",
  };
  return (
    <p className={`text-xs ${styles[status]}`}>{labels[status]}</p>
  );
}
