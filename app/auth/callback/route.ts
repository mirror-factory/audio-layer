export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "magiclink";
  const next = searchParams.get("next") ?? "/";

  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // If no code AND no token_hash, the token is in the URL hash fragment
  // which can't be read server-side. Redirect to a client page that handles it.
  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}/auth/confirm`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>,
      ) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  if (code) {
    // PKCE flow
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/sign-in?error=auth_exchange_failed`);
    }
  } else if (tokenHash) {
    // OTP / magic link with token_hash
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "email",
    });
    if (error) {
      return NextResponse.redirect(`${origin}/sign-in?error=verify_failed`);
    }
  }

  return response;
}
