/**
 * Next.js middleware — three responsibilities:
 *
 * 1. Gate /dev-kit dashboard behind DEV_KIT_DASHBOARD_SECRET
 * 2. Inject x-request-id on every request (correlates with withRoute logs)
 * 3. Ensure every visitor has a Supabase session (anonymous sign-in)
 *
 * Uses NEXT_PUBLIC_ env vars as fallback for Vercel Edge compatibility.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { devKitAuthGuard, isDevKitPath } from './lib/middleware-dev-kit';
import { createServerClient } from '@supabase/ssr';

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function middleware(req: NextRequest) {
  // 1. Gate the dev-kit dashboard
  if (isDevKitPath(req.nextUrl.pathname)) {
    const blocked = devKitAuthGuard(req);
    if (blocked) return blocked;
  }

  // 2. Inject x-request-id
  const incoming = req.headers.get('x-request-id');
  const requestId = incoming && /^[\w_-]{1,64}$/.test(incoming) ? incoming : generateRequestId();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('x-request-id', requestId);

  // 3. Supabase anonymous auth
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anon) {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
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
      await supabase.auth.signInAnonymously().catch(() => {});
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|worklets/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|js\\.map|css\\.map)$).*)',
  ],
};
