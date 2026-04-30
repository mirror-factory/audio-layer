"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, ChevronDown, CalendarDays, ExternalLink, BellRing } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { RecordingReminderPanel } from "@/components/recording-reminder";
import { IntegrationsSettingsPanel } from "@/components/integrations-settings-panel";
import {
  DEFAULTS,
  MODEL_OPTIONS,
  type ModelSettings,
} from "@/lib/settings-shared";

interface CalendarEventPreview {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
}

interface CalendarOverview {
  connected: boolean;
  provider: string | null;
  accountEmail: string | null;
  items: CalendarEventPreview[];
  setupRequired?: boolean;
  providerSetupRequired?: boolean;
  reauthRequired?: boolean;
  calendarFetchFailed?: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ModelSettings>(DEFAULTS);
  const [calendarOverview, setCalendarOverview] = useState<CalendarOverview>({
    connected: false,
    provider: null,
    accountEmail: null,
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [calendarNotice] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const status = new URLSearchParams(window.location.search).get("calendar");
    return status ? calendarNoticeFromStatus(status) : null;
  });

  const loadCalendarOverview = useCallback(() => {
    fetch("/api/calendar/upcoming?limit=1")
      .then((r) => r.json())
      .then((data) =>
        setCalendarOverview({
          connected: Boolean(data.connected),
          provider: data.provider ?? null,
          accountEmail: data.accountEmail ?? null,
          items: Array.isArray(data.items) ? data.items : [],
          setupRequired: Boolean(data.setupRequired),
          providerSetupRequired: Boolean(data.providerSetupRequired),
          reauthRequired: Boolean(data.reauthRequired),
          calendarFetchFailed: Boolean(data.calendarFetchFailed),
        }),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    loadCalendarOverview();

  }, [loadCalendarOverview]);

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
      <div className="paper-calm-page min-h-screen-safe flex flex-col bg-[var(--bg-primary)]">
        <TopBar title="Settings" showBack />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="text-[#14b8a6] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="paper-calm-page min-h-screen-safe flex flex-col bg-[var(--bg-primary)]">
      <TopBar title="Settings" showBack />

      <main className="flex-1 px-4 pb-safe py-6 max-w-xl mx-auto w-full space-y-8">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
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
          description="Runtime model for pre-recorded audio. Provider switching is modeled in Pricing Admin until adapters are wired."
          value={settings.batchSpeechModel}
          options={MODEL_OPTIONS.batchSpeech}
          onChange={(v) => save({ batchSpeechModel: v })}
        />

        {/* Streaming Speech Model */}
        <SelectGroup
          label="Streaming Speech Model"
          description="Runtime model for real-time transcription. Deepgram requires DEEPGRAM_API_KEY."
          value={settings.streamingSpeechModel}
          options={MODEL_OPTIONS.streamingSpeech}
          onChange={(v) => save({ streamingSpeechModel: v })}
        />

        <CalendarSettingsPanel
          overview={calendarOverview}
          notice={calendarNotice}
          onRefresh={loadCalendarOverview}
        />

        <ReminderSettingsPanel upcomingEvent={calendarOverview.items[0] ?? null} />

        <IntegrationsSettingsPanel />
      </main>
    </div>
  );
}

function ReminderSettingsPanel({
  upcomingEvent,
}: {
  upcomingEvent: CalendarEventPreview | null;
}) {
  return (
    <section id="recording-reminders" className="glass-card rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="settings-reminder-icon" aria-hidden="true">
          <BellRing size={17} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Recording Reminders
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Schedule recording nudges here so the capture screen stays focused
            on one action.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <RecordingReminderPanel upcomingEvent={upcomingEvent} />
      </div>
    </section>
  );
}

function CalendarSettingsPanel({
  overview,
  notice,
  onRefresh,
}: {
  overview: CalendarOverview;
  notice: string | null;
  onRefresh: () => void;
}) {
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const status = overview.connected
    ? overview.accountEmail ?? overview.provider ?? "Connected"
    : overview.setupRequired
      ? "Database setup needed"
      : "Not connected";
  const activeProvider = overview.provider === "outlook" ? "outlook" : "google";
  const needsSetup = overview.setupRequired || overview.providerSetupRequired;

  const disconnect = async (provider: "google" | "outlook") => {
    setDisconnecting(provider);
    try {
      await fetch(`/api/calendar/disconnect/${provider}`, { method: "POST" });
      onRefresh();
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <section id="calendar" className="glass-card rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="settings-calendar-icon" aria-hidden="true">
          <CalendarDays size={17} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Calendar
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Show upcoming meetings on the recording screen so the next capture
            starts with the right context.
          </p>
        </div>
      </div>

      <div className="settings-selected-details mt-4 rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] px-3 py-2.5">
        <div className="text-xs font-medium leading-5 text-[var(--text-secondary)]">
          Status
        </div>
        <div className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
          {status}
        </div>
      </div>

      {notice && (
        <div className="calendar-setup-note mt-3 rounded-lg px-3 py-2.5">
          {notice}
        </div>
      )}

      {needsSetup && (
        <div className="calendar-setup-note mt-3 rounded-lg px-3 py-2.5">
          Add the calendar OAuth environment variables and run the calendar
          migration before connecting a provider.
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <CalendarProviderOption
          label="Google Calendar"
          provider="google"
          connected={overview.connected && activeProvider === "google"}
          disconnecting={disconnecting === "google"}
          onDisconnect={disconnect}
        />
        <CalendarProviderOption
          label="Outlook Calendar"
          provider="outlook"
          connected={overview.connected && activeProvider === "outlook"}
          disconnecting={disconnecting === "outlook"}
          onDisconnect={disconnect}
        />
      </div>
    </section>
  );
}

function calendarNoticeFromStatus(status: string): string {
  const notices: Record<string, string> = {
    connected: "Calendar connected. Upcoming meetings will appear on the record screen.",
    setup_required: "Calendar setup needs provider credentials before OAuth can start.",
    database_error: "Calendar connection could not be saved. Check the Supabase migration.",
    provider_error: "Calendar provider sign-in failed. Check the OAuth credentials and redirect URL.",
    provider_denied: "Calendar connection was canceled at the provider.",
    state_mismatch: "Calendar sign-in expired. Start the connection again.",
    auth_required: "Sign in again before connecting a calendar.",
  };

  return notices[status] ?? "Calendar setup needs attention.";
}

function CalendarProviderOption({
  label,
  provider,
  connected,
  disconnecting,
  onDisconnect,
}: {
  label: string;
  provider: "google" | "outlook";
  connected: boolean;
  disconnecting: boolean;
  onDisconnect: (provider: "google" | "outlook") => void;
}) {
  if (connected) {
    return (
      <button
        type="button"
        onClick={() => onDisconnect(provider)}
        disabled={disconnecting}
        className="calendar-provider-option is-connected min-h-[48px] rounded-lg px-3 text-left"
      >
        <span>{label}</span>
        <span>{disconnecting ? "Disconnecting..." : "Disconnect"}</span>
      </button>
    );
  }

  return (
    <a
      href={`/api/calendar/connect/${provider}`}
      className="calendar-provider-option min-h-[48px] rounded-lg px-3 text-left"
    >
      <span>{label}</span>
      <span>
        Connect <ExternalLink size={12} aria-hidden="true" />
      </span>
    </a>
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
  const selected = options.find((opt) => opt.value === value);

  return (
    <div className="glass-card rounded-xl p-4 settings-option-group">
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
        {label}
      </label>
      <p className="text-xs leading-5 text-[var(--text-muted)] mb-3">
        {description}
      </p>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="settings-select signal-input min-h-[48px] w-full cursor-pointer appearance-none rounded-lg py-3 pl-3 pr-10 text-sm font-medium text-[var(--text-primary)] transition-colors duration-200 focus:outline-none"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          aria-hidden="true"
        />
      </div>
      {selected && (
        <div className="settings-selected-details mt-3 rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] px-3 py-2.5">
          <div className="text-xs font-medium leading-5 text-[var(--text-secondary)]">
            {selected.label}
          </div>
          <div className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
            {selected.price}
          </div>
        </div>
      )}
    </div>
  );
}
