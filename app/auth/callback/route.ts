/**
 * GET /auth/callback?code=...&next=...
 *
 * Magic-link landing. Exchanges the one-time code for a session,
 * sets the session cookies, and redirects. `next` query param lets
 * us route the user back to wherever they started (defaults to /).
 */

import { NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/supabase/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=missing_code", url));
  }

  const supabase = await getSupabaseUser();
  if (!supabase) {
    return NextResponse.redirect(
      new URL("/sign-in?error=supabase_unconfigured", url),
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeURIComponent(error.message)}`,
        url,
      ),
    );
  }

  return NextResponse.redirect(new URL(next, url));
}
