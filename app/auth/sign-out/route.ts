/**
 * POST /auth/sign-out
 *
 * Server-side sign out. Clears the Supabase session cookie and
 * redirects home. POST-only to prevent accidental sign-out from
 * link previews / prefetchers.
 */

import { NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/supabase/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const supabase = await getSupabaseUser();
  if (supabase) {
    await supabase.auth.signOut().catch(() => {
      /* ignore — we still want to redirect home */
    });
  }
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
