/**
 * Supabase server-side client factory.
 *
 * Uses the service-role key so server routes can read/write the
 * `meetings` table without RLS. Never import this from client
 * components — the service role bypasses all policies.
 *
 * Returns null when env is missing, so the MeetingsStore can fall back
 * to the in-memory implementation for zero-setup local dev.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function getSupabaseServer(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    cached = null;
    return null;
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Test seam: clear the cached client. */
export function __resetSupabaseClient(): void {
  cached = undefined;
}
