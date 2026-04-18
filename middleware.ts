/**
 * Edge middleware: ensure every request has a Supabase session.
 *
 * If Supabase auth is configured (SUPABASE_URL + SUPABASE_ANON_KEY),
 * this signs the visitor in anonymously on first request so the
 * meetings they create have a stable owner. Real sign-in (email or
 * OAuth) can be layered on top later — anonymous users can be
 * upgraded in place via Supabase's `linkIdentity()` flow.
 *
 * If Supabase isn't configured, the middleware no-ops; the app falls
 * back to the in-memory MeetingsStore for single-process dev use.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // Use NEXT_PUBLIC_ variants so these are available on Vercel Edge runtime
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(items) {
        for (const { name, value, options } of items) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    // Anonymous sign-in establishes a stable user_id without any UI
    // friction. The session cookie persists across visits.
    await supabase.auth.signInAnonymously().catch(() => {
      /* network blip — next request will retry */
    });
  }

  return response;
}

export const config = {
  // Skip static assets and the AudioWorklet so we don't churn
  // session refreshes on every chunk fetch.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|worklets/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|js\\.map|css\\.map)$).*)",
  ],
};
