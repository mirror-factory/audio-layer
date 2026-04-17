/**
 * Per-request Supabase client bound to the user's cookie session.
 *
 * Reads/writes go through the user's anon-role identity, so RLS
 * policies on the `meetings` table enforce ownership without us
 * having to thread `user_id` filters through every query.
 *
 * Usage in route handlers and server components:
 *
 *   import { getSupabaseUser } from "@/lib/supabase/user";
 *   const supabase = await getSupabaseUser();
 *
 * Returns null when SUPABASE_URL / SUPABASE_ANON_KEY aren't set
 * (zero-config dev mode using the in-memory MeetingsStore).
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSupabaseUser(): Promise<SupabaseClient | null> {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items) {
        // Server components can't write cookies. Middleware refreshes
        // the session on each request, so this no-ops safely outside
        // the middleware context.
        try {
          for (const { name, value, options } of items) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /* ignore — read-only context */
        }
      },
    },
  });
}

/**
 * Returns the current authenticated user id (uuid) from the request
 * cookie session, or null if Supabase auth isn't configured / no
 * session exists yet.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await getSupabaseUser();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
