export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { getCurrentUserId } from "@/lib/supabase/user";
import {
  buildCalendarAuthorizeUrl,
  calendarProviderSetupEnv,
  parseCalendarProvider,
} from "@/lib/calendar/providers";
import { hasCalendarTokenKey } from "@/lib/calendar/crypto";

const STATE_COOKIE_PREFIX = "lo_calendar_oauth_";

function settingsRedirect(req: Request, status: string, provider?: string): URL {
  const url = new URL("/settings", req.url);
  url.searchParams.set("calendar", status);
  if (provider) url.searchParams.set("provider", provider);
  url.hash = "calendar";
  return url;
}

export const GET = withRoute(async (req, ctx) => {
  const provider = parseCalendarProvider(ctx.params?.provider);
  if (!provider) {
    return NextResponse.redirect(settingsRedirect(req, "invalid_provider"));
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const authUrl = buildCalendarAuthorizeUrl(provider, new URL(req.url).origin, randomBytes(24).toString("base64url"));
  if (!authUrl || !hasCalendarTokenKey()) {
    const missing = calendarProviderSetupEnv(provider).join(",");
    const url = settingsRedirect(req, "setup_required", provider);
    url.searchParams.set("missing", missing);
    return NextResponse.redirect(url);
  }

  const state = new URL(authUrl).searchParams.get("state");
  if (!state) {
    return NextResponse.redirect(settingsRedirect(req, "setup_required", provider));
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(`${STATE_COOKIE_PREFIX}${provider}`, state, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: new URL(req.url).protocol === "https:",
  });
  return response;
});
