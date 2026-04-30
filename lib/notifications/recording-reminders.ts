"use client";

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export const RECORDING_REMINDER_ID = 10013;
export const RECORDING_REMINDER_STORAGE_KEY = "layers-recording-reminder";

export interface RecordingReminder {
  id: number;
  at: string;
  label: string;
}

export interface ScheduleRecordingReminderInput {
  minutesFromNow: number;
  label?: string;
}

function reminderDate(minutesFromNow: number): Date {
  const minutes = Math.max(1, Math.round(minutesFromNow));
  return new Date(Date.now() + minutes * 60_000);
}

function normalizeReminderDate(at: Date | string): Date {
  const date = typeof at === "string" ? new Date(at) : at;
  if (Number.isNaN(date.getTime())) {
    throw new Error("Reminder time is invalid.");
  }
  if (date.getTime() <= Date.now()) {
    throw new Error("Reminder time must be in the future.");
  }
  return date;
}

export function readStoredRecordingReminder(): RecordingReminder | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(RECORDING_REMINDER_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as RecordingReminder;
    if (!parsed.at || new Date(parsed.at).getTime() <= Date.now()) {
      window.localStorage.removeItem(RECORDING_REMINDER_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(RECORDING_REMINDER_STORAGE_KEY);
    return null;
  }
}

function storeReminder(reminder: RecordingReminder) {
  window.localStorage.setItem(RECORDING_REMINDER_STORAGE_KEY, JSON.stringify(reminder));
}

function clearStoredReminder() {
  window.localStorage.removeItem(RECORDING_REMINDER_STORAGE_KEY);
}

export function supportsBrowserNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

async function scheduleRecordingReminderForDate(
  at: Date,
  label = "Start recording",
): Promise<RecordingReminder> {
  const reminder: RecordingReminder = {
    id: RECORDING_REMINDER_ID,
    at: at.toISOString(),
    label,
  };

  if (Capacitor.isNativePlatform()) {
    const current = await LocalNotifications.checkPermissions();
    const permission =
      current.display === "granted"
        ? current
        : await LocalNotifications.requestPermissions();

    if (permission.display !== "granted") {
      throw new Error("Notification permission was not granted.");
    }

    await LocalNotifications.cancel({
      notifications: [{ id: RECORDING_REMINDER_ID }],
    });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: RECORDING_REMINDER_ID,
          title: "Record this meeting",
          body: "Layers is ready. Tap to start a live recording.",
          schedule: { at, allowWhileIdle: true },
          actionTypeId: "recording-reminder",
          extra: { href: "/record/live" },
        },
      ],
    });
  } else if (supportsBrowserNotifications()) {
    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();

    if (permission !== "granted") {
      throw new Error("Notification permission was not granted.");
    }
  } else {
    throw new Error("This device does not support notifications.");
  }

  storeReminder(reminder);
  return reminder;
}

export async function scheduleRecordingReminder({
  minutesFromNow,
  label = "Start recording",
}: ScheduleRecordingReminderInput): Promise<RecordingReminder> {
  return scheduleRecordingReminderForDate(reminderDate(minutesFromNow), label);
}

export async function scheduleRecordingReminderAt({
  at,
  label = "Start recording",
}: {
  at: Date | string;
  label?: string;
}): Promise<RecordingReminder> {
  return scheduleRecordingReminderForDate(normalizeReminderDate(at), label);
}

export async function cancelRecordingReminder(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.cancel({
      notifications: [{ id: RECORDING_REMINDER_ID }],
    }).catch(() => {});
  }
  clearStoredReminder();
}

export async function addRecordingReminderActionListener(
  onOpen: () => void,
): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};

  const handle = await LocalNotifications.addListener(
    "localNotificationActionPerformed",
    (event) => {
      const href = event.notification.extra?.href;
      if (href === "/record/live") onOpen();
    },
  );

  return () => {
    handle.remove();
  };
}

export function fireBrowserRecordingReminder(onOpen: () => void): void {
  if (!supportsBrowserNotifications() || Notification.permission !== "granted") {
    return;
  }

  const notification = new Notification("Record this meeting", {
    body: "Layers is ready. Tap to start a live recording.",
    tag: "layers-recording-reminder",
  });
  notification.onclick = () => {
    onOpen();
    notification.close();
  };
}
