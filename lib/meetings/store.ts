/**
 * MeetingsStore — single entry point for meeting persistence.
 *
 * When SUPABASE_URL + a Supabase key are set, writes go to the
 * `meetings` table. Otherwise falls back to an in-memory store so
 * local dev works with zero external setup. Production must configure
 * Supabase — state is lost on redeploy otherwise.
 */

import { getSupabaseServer } from "@/lib/supabase/server";
import type {
  Meeting,
  MeetingInsert,
  MeetingListItem,
  MeetingUpdate,
} from "./types";
import { InMemoryMeetingsStore } from "./store-in-memory";
import { SupabaseMeetingsStore } from "./store-supabase";

export interface MeetingsStore {
  insert(row: MeetingInsert): Promise<Meeting>;
  update(id: string, patch: MeetingUpdate): Promise<Meeting | null>;
  get(id: string): Promise<Meeting | null>;
  list(limit: number): Promise<MeetingListItem[]>;
}

let cached: MeetingsStore | null = null;
let loggedFallback = false;

export function getMeetingsStore(): MeetingsStore {
  if (cached) return cached;
  const client = getSupabaseServer();
  if (client) {
    cached = new SupabaseMeetingsStore(client);
  } else {
    if (!loggedFallback) {
      console.warn( // keep: one-time warning, not debug noise
        "[meetings] SUPABASE_URL not set — using in-memory store. State will be lost on redeploy.",
      );
      loggedFallback = true;
    }
    cached = new InMemoryMeetingsStore();
  }
  return cached;
}

/** Test seam: reset the cached store. */
export function __resetMeetingsStore(): void {
  cached = null;
  loggedFallback = false;
}
