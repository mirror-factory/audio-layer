export interface LocalRecordingDraft {
  meetingId: string;
  updatedAt: string;
  durationSeconds: number;
  text: string;
  title?: string | null;
  turnCount: number;
  partial: string;
  providerModel?: string;
}

export interface RecordingDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const DRAFT_PREFIX = "layers-recording-draft:";
const LATEST_KEY = "layers-recording-draft:latest";

export function recordingDraftKey(meetingId: string): string {
  return `${DRAFT_PREFIX}${meetingId}`;
}

export function saveLocalRecordingDraft(
  storage: RecordingDraftStorage | null,
  draft: LocalRecordingDraft,
): boolean {
  if (!storage || !draft.meetingId) return false;

  try {
    const serialized = JSON.stringify(draft);
    storage.setItem(recordingDraftKey(draft.meetingId), serialized);
    storage.setItem(LATEST_KEY, draft.meetingId);
    return true;
  } catch {
    return false;
  }
}

export function clearLocalRecordingDraft(
  storage: RecordingDraftStorage | null,
  meetingId: string,
): boolean {
  if (!storage || !meetingId) return false;

  try {
    storage.removeItem(recordingDraftKey(meetingId));
    if (storage.getItem(LATEST_KEY) === meetingId) {
      storage.removeItem(LATEST_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export function readLatestLocalRecordingDraft(
  storage: RecordingDraftStorage | null,
): LocalRecordingDraft | null {
  if (!storage) return null;

  try {
    const latestMeetingId = storage.getItem(LATEST_KEY);
    if (!latestMeetingId) return null;
    const raw = storage.getItem(recordingDraftKey(latestMeetingId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalRecordingDraft;
    if (!parsed.meetingId || typeof parsed.text !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
