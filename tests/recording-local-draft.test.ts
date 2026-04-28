import { describe, expect, it } from "vitest";
import {
  clearLocalRecordingDraft,
  readLatestLocalRecordingDraft,
  recordingDraftKey,
  saveLocalRecordingDraft,
  type RecordingDraftStorage,
} from "@/lib/recording/local-draft";

function memoryStorage(): RecordingDraftStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

describe("local recording drafts", () => {
  it("saves and reads the latest draft", () => {
    const storage = memoryStorage();

    const saved = saveLocalRecordingDraft(storage, {
      meetingId: "meeting_a",
      updatedAt: "2026-04-26T00:00:00.000Z",
      durationSeconds: 42,
      text: "Budget was approved",
      turnCount: 1,
      partial: "",
      providerModel: "universal-streaming-multilingual",
    });

    expect(saved).toBe(true);
    expect(storage.data.has(recordingDraftKey("meeting_a"))).toBe(true);
    expect(readLatestLocalRecordingDraft(storage)).toMatchObject({
      meetingId: "meeting_a",
      text: "Budget was approved",
      durationSeconds: 42,
    });
  });

  it("clears the latest pointer when the draft is finalized", () => {
    const storage = memoryStorage();
    saveLocalRecordingDraft(storage, {
      meetingId: "meeting_a",
      updatedAt: "2026-04-26T00:00:00.000Z",
      durationSeconds: 1,
      text: "",
      turnCount: 0,
      partial: "",
    });

    expect(clearLocalRecordingDraft(storage, "meeting_a")).toBe(true);
    expect(readLatestLocalRecordingDraft(storage)).toBeNull();
  });
});
