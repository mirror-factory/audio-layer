/**
 * In-memory MeetingsStore implementation.
 *
 * Used when SUPABASE_URL is not set (zero-setup local dev). State is
 * per-process and lost on redeploy — fine for development, NOT for
 * production.
 */

import type {
  Meeting,
  MeetingInsert,
  MeetingListItem,
  MeetingUpdate,
} from "./types";
import type { MeetingsStore } from "./store";

const MAX_ENTRIES = 500;

export class InMemoryMeetingsStore implements MeetingsStore {
  private store = new Map<string, Meeting>();

  async insert(row: MeetingInsert): Promise<Meeting> {
    if (this.store.size >= MAX_ENTRIES) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    const now = new Date().toISOString();
    const rec: Meeting = {
      id: row.id,
      status: row.status ?? "processing",
      title: row.title ?? null,
      text: null,
      utterances: [],
      durationSeconds: null,
      summary: null,
      intakeForm: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(row.id, rec);
    return rec;
  }

  async update(id: string, patch: MeetingUpdate): Promise<Meeting | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated: Meeting = {
      ...existing,
      ...patch,
      // Preserve required-non-null fields; `?? existing.x` handles partials.
      utterances: patch.utterances ?? existing.utterances,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }

  async get(id: string): Promise<Meeting | null> {
    return this.store.get(id) ?? null;
  }

  async list(limit: number): Promise<MeetingListItem[]> {
    return [...this.store.values()]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit)
      .map((m) => ({
        id: m.id,
        status: m.status,
        title: m.title,
        durationSeconds: m.durationSeconds,
        createdAt: m.createdAt,
      }));
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
