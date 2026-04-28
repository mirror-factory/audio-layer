export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { getCurrentUserId, getSupabaseUser } from "@/lib/supabase/user";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  decryptCalendarToken,
  encryptCalendarToken,
} from "@/lib/calendar/crypto";
import {
  fetchUpcomingCalendarEvents,
  isCalendarProviderConfigured,
  parseCalendarProvider,
  refreshCalendarAccessToken,
  type CalendarEventItem,
} from "@/lib/calendar/providers";

interface CalendarConnectionRow {
  provider: string;
  provider_account_email: string | null;
  status: string;
  updated_at: string;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  token_expires_at: string | null;
}

function limitFromUrl(req: Request): number {
  const value = new URL(req.url).searchParams.get("limit");
  const parsed = value ? Number.parseInt(value, 10) : 3;
  if (!Number.isFinite(parsed) || parsed < 1) return 3;
  return Math.min(parsed, 10);
}

export const GET = withRoute(async (req) => {
  const limit = limitFromUrl(req);
  const userId = await getCurrentUserId();
  const supabase = await getSupabaseUser();

  if (!userId || !supabase) {
    return NextResponse.json({
      connected: false,
      provider: null,
      accountEmail: null,
      items: [],
      limit,
      setupRequired: false,
    });
  }

  const { data, error } = await supabase
    .from("calendar_connections")
    .select(
      "provider, provider_account_email, status, updated_at, access_token_enc, refresh_token_enc, token_expires_at",
    )
    .eq("user_id", userId)
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({
      connected: false,
      provider: null,
      accountEmail: null,
      items: [],
      limit,
      setupRequired: error.code === "42P01",
    });
  }

  const [connection] = (data ?? []) as CalendarConnectionRow[];
  const provider = parseCalendarProvider(connection?.provider);
  let items: CalendarEventItem[] = [];
  let reauthRequired = false;
  let providerSetupRequired = false;
  let calendarFetchFailed = false;

  if (connection && provider) {
    providerSetupRequired = !isCalendarProviderConfigured(provider);

    if (!providerSetupRequired) {
      let accessToken = decryptCalendarToken(connection.access_token_enc);
      const refreshToken = decryptCalendarToken(connection.refresh_token_enc);
      const expiresAt = connection.token_expires_at
        ? new Date(connection.token_expires_at).getTime()
        : null;
      const shouldRefresh =
        Boolean(refreshToken) &&
        (!expiresAt || expiresAt < Date.now() + 2 * 60 * 1000);

      if (shouldRefresh && refreshToken) {
        try {
          const refreshed = await refreshCalendarAccessToken(provider, refreshToken);
          accessToken = refreshed.accessToken;
          await getSupabaseServer()
            ?.from("calendar_connections")
            .update({
              access_token_enc: encryptCalendarToken(refreshed.accessToken),
              refresh_token_enc: encryptCalendarToken(
                refreshed.refreshToken ?? refreshToken,
              ),
              scopes: refreshed.scope,
              token_expires_at: refreshed.expiresAt,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("provider", provider);
        } catch {
          reauthRequired = true;
        }
      }

      if (accessToken && !reauthRequired) {
        try {
          items = await fetchUpcomingCalendarEvents(provider, accessToken, limit);
        } catch {
          calendarFetchFailed = true;
        }
      } else if (!accessToken) {
        reauthRequired = true;
      }
    }
  }

  return NextResponse.json({
    connected: Boolean(connection),
    provider: connection?.provider ?? null,
    accountEmail: connection?.provider_account_email ?? null,
    items,
    limit,
    setupRequired: false,
    providerSetupRequired,
    reauthRequired,
    calendarFetchFailed,
  });
});
