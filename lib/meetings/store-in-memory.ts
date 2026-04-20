/**
 * In-memory meetings store for local dev without Supabase.
 * Process-wide Map. Data lost on restart.
 */

import type { Meeting, MeetingInsert, MeetingListItem, MeetingUpdate } from "./types";
import type { MeetingsStore } from "./store";

const MAX_ENTRIES = 500;

const store = new Map<string, Meeting>();

export class InMemoryMeetingsStore implements MeetingsStore {
  async insert(row: MeetingInsert): Promise<Meeting> {
    const now = new Date().toISOString();
    const meeting: Meeting = {
      id: row.id,
      status: row.status ?? "processing",
      title: row.title ?? null,
      text: null,
      utterances: [],
      durationSeconds: null,
      summary: null,
      intakeForm: null,
      costBreakdown: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };

    // Evict oldest if at capacity
    if (store.size >= MAX_ENTRIES) {
      const oldest = [...store.entries()].sort(
        (a, b) =>
          new Date(a[1].createdAt).getTime() -
          new Date(b[1].createdAt).getTime(),
      )[0];
      if (oldest) store.delete(oldest[0]);
    }

    store.set(meeting.id, meeting);
    return meeting;
  }

  async update(id: string, patch: MeetingUpdate): Promise<Meeting | null> {
    const existing = store.get(id);
    if (!existing) return null;

    const updated: Meeting = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    store.set(id, updated);
    return updated;
  }

  async get(id: string): Promise<Meeting | null> {
    return store.get(id) ?? null;
  }

  async list(limit: number): Promise<MeetingListItem[]> {
    return [...store.values()]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit)
      .map(({ id, status, title, durationSeconds, createdAt }) => ({
        id,
        status,
        title,
        durationSeconds,
        createdAt,
      }));
  }
}
