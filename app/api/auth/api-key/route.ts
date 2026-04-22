export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { withRoute } from "@/lib/with-route";
import { getCurrentUserId } from "@/lib/supabase/user";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/auth/api-key -- return the current API key (masked).
 */
export const GET = withRoute(async () => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("api_key")
    .eq("user_id", userId)
    .single();

  if (error || !data?.api_key) {
    return NextResponse.json({ apiKey: null });
  }

  // Mask all but last 4 characters
  const key = data.api_key as string;
  const masked = "lo1_" + "*".repeat(Math.max(0, key.length - 8)) + key.slice(-4);

  return NextResponse.json({ apiKey: masked, hasKey: true });
});

/**
 * POST /api/auth/api-key -- generate a new API key.
 */
export const POST = withRoute(async () => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }

  // Generate a prefixed API key
  const rawBytes = randomBytes(32).toString("hex");
  const apiKey = `lo1_${rawBytes}`;

  const { error } = await supabase
    .from("profiles")
    .update({ api_key: apiKey })
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to generate API key" },
      { status: 500 },
    );
  }

  return NextResponse.json({ apiKey });
});

/**
 * DELETE /api/auth/api-key -- revoke the API key.
 */
export const DELETE = withRoute(async () => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ api_key: null })
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 },
    );
  }

  return NextResponse.json({ revoked: true });
});
