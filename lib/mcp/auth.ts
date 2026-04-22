/**
 * MCP API key authentication.
 * Validates a Bearer token against the profiles.api_key column.
 */

import { getSupabaseServer } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

export interface McpAuthResult {
  userId: string;
}

/**
 * Validate an API key from the Authorization header.
 * Returns the user_id if valid, null otherwise.
 */
export async function validateApiKey(
  key: string,
): Promise<McpAuthResult | null> {
  if (!key || key.length < 16) return null;

  const supabase = getSupabaseServer();
  if (!supabase) {
    log.warn("mcp-auth.skip", { reason: "supabase not configured" });
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("api_key", key)
    .single();

  if (error || !data) {
    return null;
  }

  return { userId: data.user_id as string };
}
