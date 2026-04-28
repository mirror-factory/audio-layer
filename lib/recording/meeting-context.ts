export const MAX_RECORDING_TITLE_LENGTH = 120;

export interface CalendarRecordingItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
}

export interface RecordingMeetingContext {
  meetingTitle: string;
  source: "calendar";
  calendarEventId: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  provider?: string | null;
}

export function cleanRecordingTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  return normalized.slice(0, MAX_RECORDING_TITLE_LENGTH);
}

export function pickRecordingCalendarContext(
  items: CalendarRecordingItem[],
  provider?: string | null,
): RecordingMeetingContext | null {
  const next = items.find((item) => cleanRecordingTitle(item.title));
  if (!next) return null;

  const meetingTitle = cleanRecordingTitle(next.title);
  if (!meetingTitle) return null;

  return {
    meetingTitle,
    source: "calendar",
    calendarEventId: next.id,
    startsAt: next.startsAt,
    endsAt: next.endsAt ?? null,
    location: next.location ?? null,
    provider: provider ?? null,
  };
}

export function formatRecordingContextTime(startsAt: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "upcoming";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
