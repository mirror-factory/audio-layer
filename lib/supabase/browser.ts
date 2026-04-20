"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let instance: SupabaseClient | null = null;

/**
 * Browser-side Supabase client (singleton).
 * Returns null when NEXT_PUBLIC_ env vars are missing.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (instance) return instance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  instance = createClient(url, anonKey);
  return instance;
}
