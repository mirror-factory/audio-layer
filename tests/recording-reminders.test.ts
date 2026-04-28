// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    addListener: vi.fn(),
    cancel: vi.fn(),
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    schedule: vi.fn(),
  },
}));

import {
  RECORDING_REMINDER_STORAGE_KEY,
  readStoredRecordingReminder,
  scheduleRecordingReminderAt,
} from "@/lib/notifications/recording-reminders";

const requestPermission = vi.fn<() => Promise<NotificationPermission>>();

class MockNotification {
  static permission: NotificationPermission = "default";
  static requestPermission = requestPermission;

  onclick: (() => void) | null = null;

  constructor(
    public title: string,
    public options?: NotificationOptions,
  ) {}

  close() {}
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-27T14:00:00.000Z"));
  window.localStorage.clear();
  requestPermission.mockReset();
  requestPermission.mockResolvedValue("granted");
  MockNotification.permission = "default";
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: MockNotification,
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: MockNotification,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("recording reminders", () => {
  it("stores an exact calendar-aware reminder after notification permission is granted", async () => {
    const reminder = await scheduleRecordingReminderAt({
      at: "2026-04-27T14:15:00.000Z",
      label: "15m before: Weekly Standup",
    });

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(reminder).toMatchObject({
      at: "2026-04-27T14:15:00.000Z",
      label: "15m before: Weekly Standup",
    });
    expect(readStoredRecordingReminder()).toEqual(reminder);
    expect(window.localStorage.getItem(RECORDING_REMINDER_STORAGE_KEY)).toContain(
      "Weekly Standup",
    );
  });

  it("rejects exact reminders in the past without storing stale state", async () => {
    await expect(
      scheduleRecordingReminderAt({
        at: "2026-04-27T13:59:00.000Z",
        label: "Past meeting",
      }),
    ).rejects.toThrow("future");

    expect(requestPermission).not.toHaveBeenCalled();
    expect(readStoredRecordingReminder()).toBeNull();
  });
});
