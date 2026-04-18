/**
 * /settings — pick AssemblyAI and LLM models.
 *
 * Client component that reads/writes via /api/settings. Preferences
 * are stored in a cookie so they persist without Supabase.
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ModelSettings, ModelOption } from "@/lib/settings-shared";
import { MODEL_OPTIONS } from "@/lib/settings-shared";

type Status = "idle" | "saving" | "saved" | "error";

interface DynamicModel {
  value: string;
  label: string;
  price: string;
  provider: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [llmModels, setLlmModels] = useState<DynamicModel[] | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => setStatus("error"));
    // Fetch live model list from Gateway
    fetch("/api/models")
      .then((r) => r.json())
      .then(setLlmModels)
      .catch(() => {/* fallback to static list */});
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
        <ModelPicker
          value={settings.summaryModel}
          options={llmModels ?? MODEL_OPTIONS.summary}
          onChange={(v) => save({ summaryModel: v })}
        />
      </section>

      <hr className="border-neutral-800" />

      <section className="space-y-5">
        <SectionHeader
          title="Transcription — pre-recorded"
          description="AssemblyAI model for batch uploads via /record. Higher quality models cost more per hour of audio."
        />
        <ModelPicker
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
        <ModelPicker
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
    <main className="min-h-dvh bg-neutral-950 px-4 pb-20 pt-10 md:px-6">
      <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 md:p-6">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-100">Settings</h1>
          <Link
            href="/"
            className="min-h-[44px] flex items-center text-xs text-neutral-500 hover:text-neutral-300"
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

function ModelPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly ModelOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex w-full min-h-[44px] items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
              isActive
                ? "border-emerald-600 bg-emerald-950/30"
                : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {isActive && (
                <span className="text-emerald-400 text-xs">&#10003;</span>
              )}
              <span
                className={`text-sm ${isActive ? "text-emerald-200 font-medium" : "text-neutral-300"}`}
              >
                {opt.label}
              </span>
            </div>
            <span className="text-xs text-neutral-500">{opt.price}</span>
          </button>
        );
      })}
    </div>
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
