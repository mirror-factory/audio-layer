/**
 * MeetingsStore — single entry point for meeting persistence.
 *
 * When SUPABASE_URL + SUPABASE_ANON_KEY are set, every request gets a
 * user-scoped Supabase client (via the cookie session) so RLS policies
 * on the `meetings` table enforce ownership automatically. We stamp
 * `user_id` on inserts so the WITH CHECK clause passes.
 *
 * Without Supabase env vars, falls back to a process-wide in-memory
 * store for single-user local dev. Production must configure Supabase.
 */

import { getSupabaseUser, getCurrentUserId } from "@/lib/supabase/user";
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

let inMemorySingleton: InMemoryMeetingsStore | null = null;
let loggedFallback = false;

function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

/**
 * Returns the right MeetingsStore implementation for the current
 * request. Async because Supabase needs the cookie store before the
 * client can be built.
 *
 * Throws when Supabase is configured but the request has no user
 * session — middleware should have signed an anonymous user in, so
 * this only fires on misconfiguration (e.g., missing middleware).
 */
export async function getMeetingsStore(): Promise<MeetingsStore> {
  if (!isSupabaseConfigured()) {
    if (!loggedFallback) {
      console.warn( // keep: one-time warning, not debug noise
        "[meetings] SUPABASE_URL not set — using in-memory store. State will be lost on redeploy.",
      );
      loggedFallback = true;
    }
    inMemorySingleton ??= new InMemoryMeetingsStore();
    return inMemorySingleton;
  }

  const supabase = await getSupabaseUser();
  const userId = await getCurrentUserId();
  if (!supabase || !userId) {
    throw new Error(
      "Supabase is configured but no user session — check middleware.ts.",
    );
  }
  return new SupabaseMeetingsStore(supabase, userId);
}

/** Test seam: clear the in-memory singleton. */
export function __resetMeetingsStore(): void {
  inMemorySingleton = null;
  loggedFallback = false;
}
