export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * OAuth Callback — called after the user signs in.
 *
 * Generates an authorization code (stored in DB), then redirects back
 * to the MCP client's redirect_uri with the code and state.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");

  if (!redirectUri || !state) {
    return NextResponse.json({ error: "Missing redirect_uri or state" }, { status: 400 });
  }

  // Get the authenticated user from cookies
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(_cookies: Array<{ name: string; value: string; options: CookieOptions }>) {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Generate a short-lived authorization code
  const code = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

  // Store the code -> user mapping
  const serviceSupabase = getSupabaseServer();
  if (serviceSupabase) {
    await serviceSupabase.from("oauth_codes").insert({
      code,
      user_id: user.id,
      redirect_uri: redirectUri,
      expires_at: expiresAt,
    });
  }

  // Redirect back to the MCP client with the code
  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("state", state);

  return NextResponse.redirect(callbackUrl.toString());
}
