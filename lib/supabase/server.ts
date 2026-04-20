import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let instance: SupabaseClient | null = null;

/**
 * Service-role Supabase client (singleton, server-only).
 * Bypasses RLS — use only for admin operations (Stripe webhooks, profiles writes).
 * Returns null when env vars are missing.
 */
export function getSupabaseServer(): SupabaseClient | null {
  if (instance) return instance;

  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  instance = createClient(url, serviceKey);
  return instance;
}
