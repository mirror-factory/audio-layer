export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { hashOAuthToken } from "@/lib/oauth/mcp-oauth";

async function readRevokeBody(req: NextRequest): Promise<Record<string, string | null> | null> {
  const contentType = req.headers.get("content-type") ?? "";
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData().catch(() => null);
    if (!form) return null;
    return Object.fromEntries(
      Array.from(form.entries()).map(([key, value]) => [
        key,
        typeof value === "string" ? value : null,
      ]),
    );
  }

  const json = await req.json().catch(() => null);
  if (!json || typeof json !== "object") return null;
  return json as Record<string, string | null>;
}

export async function POST(req: NextRequest) {
  const body = await readRevokeBody(req);
  const token = body?.token;

  if (!token) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "token is required" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "server_error", error_description: "Database not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  await supabase
    .from("oauth_refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", hashOAuthToken(token));

  return new NextResponse(null, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
