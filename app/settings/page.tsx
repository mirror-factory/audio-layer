"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import {
  DEFAULTS,
  MODEL_OPTIONS,
  type ModelSettings,
} from "@/lib/settings-shared";

export default function SettingsPage() {
  const [settings, setSettings] = useState<ModelSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(
    async (patch: Partial<ModelSettings>) => {
      const merged = { ...settings, ...patch };
      setSettings(merged);
      setSaving(true);
      setSaved(false);

      try {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        // best-effort
      } finally {
        setSaving(false);
      }
    },
    [settings],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar title="Settings" showBack />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="text-[#14b8a6] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar title="Settings" showBack />

      <main className="flex-1 px-4 py-6 max-w-xl mx-auto w-full space-y-8">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[#e5e5e5]">
            Model Preferences
          </h2>
          {saving && (
            <Loader2 size={14} className="text-[#14b8a6] animate-spin" />
          )}
          {saved && <Check size={14} className="text-[#22c55e]" />}
        </div>

        {/* Summary Model */}
        <SelectGroup
          label="Summary / Intake Model"
          description="LLM used for meeting summary and intake extraction"
          value={settings.summaryModel}
          options={MODEL_OPTIONS.summary}
          onChange={(v) => save({ summaryModel: v })}
        />

        {/* Batch Speech Model */}
        <SelectGroup
          label="Batch Speech Model"
          description="AssemblyAI model for pre-recorded audio"
          value={settings.batchSpeechModel}
          options={MODEL_OPTIONS.batchSpeech}
          onChange={(v) => save({ batchSpeechModel: v })}
        />

        {/* Streaming Speech Model */}
        <SelectGroup
          label="Streaming Speech Model"
          description="AssemblyAI model for real-time transcription"
          value={settings.streamingSpeechModel}
          options={MODEL_OPTIONS.streamingSpeech}
          onChange={(v) => save({ streamingSpeechModel: v })}
        />
      </main>
    </div>
  );
}

interface SelectGroupProps {
  label: string;
  description: string;
  value: string;
  options: readonly { value: string; label: string; price: string }[];
  onChange: (value: string) => void;
}

function SelectGroup({
  label,
  description,
  value,
  options,
  onChange,
}: SelectGroupProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
        {label}
      </label>
      <p className="text-xs text-[#525252] mb-2">{description}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#171717] text-[#d4d4d4] text-sm border border-[#262626] rounded-lg px-3 py-2.5 min-h-[44px] focus:border-[#14b8a6] focus:outline-none transition-colors duration-200 appearance-none cursor-pointer"
        style={{
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} ({opt.price})
          </option>
        ))}
      </select>
    </div>
  );
}
