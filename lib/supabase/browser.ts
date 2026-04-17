/**
 * Browser-side Supabase client.
 *
 * Used by client components (the sign-in form, future sign-up UI).
 * Hydrates from the same cookie session that middleware.ts and the
 * server-side `getSupabaseUser()` write.
 *
 * Returns null when env is missing — the sign-in page surfaces a
 * clear message in that case so dev mode without Supabase doesn't
 * silently fail.
 */

"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    cached = null;
    return null;
  }
  cached = createBrowserClient(url, anon);
  return cached;
}
