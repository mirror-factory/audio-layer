export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { encryptCalendarToken, hasCalendarTokenKey } from "@/lib/calendar/crypto";
import {
  exchangeCalendarCode,
  fetchCalendarProfile,
  parseCalendarProvider,
} from "@/lib/calendar/providers";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/user";

const STATE_COOKIE_PREFIX = "lo_calendar_oauth_";

function settingsRedirect(req: Request, status: string, provider?: string): URL {
  const url = new URL("/settings", req.url);
  url.searchParams.set("calendar", status);
  if (provider) url.searchParams.set("provider", provider);
  url.hash = "calendar";
  return url;
}

function redirectAndClearState(req: Request, status: string, provider: string): NextResponse {
  const response = NextResponse.redirect(settingsRedirect(req, status, provider));
  response.cookies.delete(`${STATE_COOKIE_PREFIX}${provider}`);
  return response;
}

export const GET = withRoute(async (req, ctx) => {
  const provider = parseCalendarProvider(ctx.params?.provider);
  if (!provider) {
    return NextResponse.redirect(settingsRedirect(req, "invalid_provider"));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const expectedState = req.cookies.get(`${STATE_COOKIE_PREFIX}${provider}`)?.value;

  if (error) return redirectAndClearState(req, "provider_denied", provider);
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectAndClearState(req, "state_mismatch", provider);
  }

  const userId = await getCurrentUserId();
  const supabase = getSupabaseServer();
  if (!userId || !supabase) {
    return redirectAndClearState(req, "auth_required", provider);
  }

  if (!hasCalendarTokenKey()) {
    return redirectAndClearState(req, "setup_required", provider);
  }

  let tokenSet: Awaited<ReturnType<typeof exchangeCalendarCode>>;
  let profile: Awaited<ReturnType<typeof fetchCalendarProfile>>;

  try {
    tokenSet = await exchangeCalendarCode(provider, url.origin, code);
    profile = await fetchCalendarProfile(provider, tokenSet.accessToken);
  } catch {
    return redirectAndClearState(req, "provider_error", provider);
  }

  const { error: upsertError } = await supabase
    .from("calendar_connections")
    .upsert(
      {
        user_id: userId,
        provider,
        provider_account_id: profile.id,
        provider_account_email: profile.email,
        status: "connected",
        scopes: tokenSet.scope,
        access_token_enc: encryptCalendarToken(tokenSet.accessToken),
        refresh_token_enc: encryptCalendarToken(tokenSet.refreshToken),
        token_expires_at: tokenSet.expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );

  if (upsertError) {
    return redirectAndClearState(req, "database_error", provider);
  }

  return redirectAndClearState(req, "connected", provider);
});
