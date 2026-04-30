"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Clock, X } from "lucide-react";
import {
  addRecordingReminderActionListener,
  cancelRecordingReminder,
  fireBrowserRecordingReminder,
  readStoredRecordingReminder,
  scheduleRecordingReminder,
  scheduleRecordingReminderAt,
  type RecordingReminder,
} from "@/lib/notifications/recording-reminders";

const PRESETS = [
  { label: "5m", minutes: 5 },
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
];

const EVENT_REMINDER_OFFSETS = [15, 5, 0] as const;

export interface RecordingReminderEvent {
  title: string;
  startsAt: string;
}

interface RecordingReminderPanelProps {
  upcomingEvent?: RecordingReminderEvent | null;
}

function formatReminderTime(reminder: RecordingReminder | null): string {
  if (!reminder) return "No reminder set";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(reminder.at));
}

export function RecordingReminderPanel({
  upcomingEvent = null,
}: RecordingReminderPanelProps) {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);
  const [reminder, setReminder] = useState<RecordingReminder | null>(() =>
    readStoredRecordingReminder(),
  );
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [nowMs, setNowMs] = useState<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const armBrowserTimer = useCallback(
    (next: RecordingReminder | null) => {
      clearTimer();
      if (!next) return;

      const delay = new Date(next.at).getTime() - Date.now();
      if (delay <= 0) return;

      timerRef.current = window.setTimeout(() => {
        fireBrowserRecordingReminder(() => router.push("/record/live"));
        setReminder(null);
        setStatus("idle");
        setFeedback("Reminder sent. Ready when you are.");
      }, delay);
    },
    [clearTimer, router],
  );

  useEffect(() => {
    armBrowserTimer(reminder);
    return clearTimer;
  }, [armBrowserTimer, clearTimer, reminder]);

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    updateNow();
    const intervalId = window.setInterval(updateNow, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let dispose: (() => void) | null = null;
    let mounted = true;

    addRecordingReminderActionListener(() => router.push("/record/live"))
      .then((cleanup) => {
        if (mounted) dispose = cleanup;
        else cleanup();
      })
      .catch(() => {});

    return () => {
      mounted = false;
      dispose?.();
    };
  }, [router]);

  const reminderLabel = useMemo(() => formatReminderTime(reminder), [reminder]);
  const eventOptions = useMemo(() => {
    if (!upcomingEvent || nowMs === null) return [];

    const startsAt = new Date(upcomingEvent.startsAt);
    if (Number.isNaN(startsAt.getTime())) return [];

    return EVENT_REMINDER_OFFSETS.map((offsetMinutes) => {
      const at = new Date(startsAt.getTime() - offsetMinutes * 60_000);
      const label =
        offsetMinutes === 0 ? "At start" : `${offsetMinutes}m before`;
      return { at, label, offsetMinutes };
    }).filter((option) => option.at.getTime() > nowMs + 5_000);
  }, [nowMs, upcomingEvent]);
  const isReady =
    Boolean(reminder) && status !== "saving" && status !== "error";
  const message =
    status === "saving"
      ? "Requesting notification access..."
      : status === "error"
        ? feedback
        : reminder
          ? `Reminder set for ${formatReminderTime(reminder)}.`
          : feedback || "Choose when Layers should remind you to record.";

  const schedule = async (minutes: number) => {
    setStatus("saving");
    setFeedback("");
    try {
      const next = await scheduleRecordingReminder({
        minutesFromNow: minutes,
        label: `In ${minutes} minutes`,
      });
      setReminder(next);
      setStatus("idle");
      setFeedback("");
    } catch (error) {
      setStatus("error");
      setFeedback(
        error instanceof Error ? error.message : "Could not set reminder.",
      );
    }
  };

  const scheduleForEvent = async (at: Date, label: string) => {
    setStatus("saving");
    setFeedback("");
    try {
      const next = await scheduleRecordingReminderAt({
        at,
        label: upcomingEvent ? `${label}: ${upcomingEvent.title}` : label,
      });
      setReminder(next);
      setStatus("idle");
      setFeedback("");
    } catch (error) {
      setStatus("error");
      setFeedback(
        error instanceof Error ? error.message : "Could not set reminder.",
      );
    }
  };

  const cancel = async () => {
    clearTimer();
    await cancelRecordingReminder();
    setReminder(null);
    setStatus("idle");
    setFeedback("Reminder cleared.");
  };

  return (
    <section
      aria-label="Recording reminder"
      className="recording-reminder signal-panel-subtle rounded-lg px-0 py-2 sm:px-3 sm:py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#14b8a6]/20 bg-[#14b8a6]/10 text-[#5eead4] sm:flex">
            {isReady ? <Check size={15} /> : <Bell size={15} />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              Record reminder
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {message}
            </p>
          </div>
        </div>
        {reminder && (
          <button
            type="button"
            onClick={cancel}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-control-hover)] hover:text-[var(--text-primary)]"
            aria-label="Cancel recording reminder"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div
        className="mt-3 flex items-center gap-2 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        <span className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-md border border-[var(--border-card)] bg-[var(--surface-control)] px-2.5 text-xs text-[var(--text-secondary)]">
          <Clock size={13} />
          <span className="sm:hidden">{reminder ? reminderLabel : "None"}</span>
          <span className="hidden sm:inline">{reminderLabel}</span>
        </span>
        {PRESETS.map((preset) => (
          <button
            key={preset.minutes}
            type="button"
            onClick={() => schedule(preset.minutes)}
            disabled={status === "saving"}
            className="min-h-[36px] shrink-0 rounded-md border border-[var(--border-card)] bg-[var(--surface-control)] px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-control-hover)] hover:text-[var(--text-primary)] disabled:opacity-60"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {upcomingEvent && (
        <div className="recording-reminder-event mt-3 rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
              {upcomingEvent.title}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {formatReminderTime({
                id: 0,
                at: upcomingEvent.startsAt,
                label: upcomingEvent.title,
              })}
            </p>
          </div>
          {eventOptions.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {eventOptions.map((option) => (
                <button
                  key={option.offsetMinutes}
                  type="button"
                  onClick={() => scheduleForEvent(option.at, option.label)}
                  disabled={status === "saving"}
                  className="min-h-[34px] rounded-md border border-[var(--border-card)] bg-[var(--bg-card)] px-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-control-hover)] hover:text-[var(--text-primary)] disabled:opacity-60"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              This meeting starts too soon for a scheduled reminder.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
