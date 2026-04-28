export const CALENDAR_PROVIDERS = ["google", "outlook"] as const;

export type CalendarProvider = (typeof CALENDAR_PROVIDERS)[number];

export interface CalendarProviderCredentials {
  clientId: string;
  clientSecret: string;
}

export interface CalendarTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string | null;
}

export interface CalendarProfile {
  id: string | null;
  email: string | null;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
}

interface ProviderDefinition {
  id: CalendarProvider;
  label: string;
  envPrefix: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: readonly string[];
}

const PROVIDER_DEFINITIONS: Record<CalendarProvider, ProviderDefinition> = {
  google: {
    id: "google",
    label: "Google Calendar",
    envPrefix: "GOOGLE_CALENDAR",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
  },
  outlook: {
    id: "outlook",
    label: "Outlook Calendar",
    envPrefix: "MICROSOFT_CALENDAR",
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["openid", "email", "offline_access", "User.Read", "Calendars.Read"],
  },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function redirectUri(origin: string, provider: CalendarProvider): string {
  return `${origin}/api/calendar/callback/${provider}`;
}

export function parseCalendarProvider(value: string | string[] | undefined): CalendarProvider | null {
  const provider = Array.isArray(value) ? value[0] : value;
  return provider === "google" || provider === "outlook" ? provider : null;
}

export function getCalendarProviderLabel(provider: CalendarProvider): string {
  return PROVIDER_DEFINITIONS[provider].label;
}

export function getCalendarCredentials(
  provider: CalendarProvider,
): CalendarProviderCredentials | null {
  const definition = PROVIDER_DEFINITIONS[provider];
  const clientId = process.env[`${definition.envPrefix}_CLIENT_ID`]?.trim();
  const clientSecret = process.env[`${definition.envPrefix}_CLIENT_SECRET`]?.trim();

  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isCalendarProviderConfigured(provider: CalendarProvider): boolean {
  return Boolean(getCalendarCredentials(provider));
}

export function calendarProviderSetupEnv(provider: CalendarProvider): string[] {
  const definition = PROVIDER_DEFINITIONS[provider];
  return [
    `${definition.envPrefix}_CLIENT_ID`,
    `${definition.envPrefix}_CLIENT_SECRET`,
    "CALENDAR_TOKEN_ENCRYPTION_KEY",
  ];
}

export function buildCalendarAuthorizeUrl(
  provider: CalendarProvider,
  origin: string,
  state: string,
): string | null {
  const credentials = getCalendarCredentials(provider);
  if (!credentials) return null;

  const definition = PROVIDER_DEFINITIONS[provider];
  const url = new URL(definition.authorizeUrl);
  url.searchParams.set("client_id", credentials.clientId);
  url.searchParams.set("redirect_uri", redirectUri(origin, provider));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", definition.scopes.join(" "));
  url.searchParams.set("state", state);

  if (provider === "google") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }

  return url.toString();
}

async function readTokenResponse(response: Response): Promise<CalendarTokenSet> {
  const body = asRecord(await response.json().catch(() => null));
  if (!response.ok || !body) {
    const message =
      asString(body?.error_description) ??
      asString(body?.error) ??
      `Calendar token exchange failed with ${response.status}`;
    throw new Error(message);
  }

  const accessToken = asString(body.access_token);
  if (!accessToken) throw new Error("Calendar provider did not return an access token");

  const expiresIn =
    typeof body.expires_in === "number"
      ? body.expires_in
      : Number.parseInt(String(body.expires_in ?? ""), 10);

  return {
    accessToken,
    refreshToken: asString(body.refresh_token),
    expiresAt: Number.isFinite(expiresIn)
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null,
    scope: asString(body.scope),
  };
}

export async function exchangeCalendarCode(
  provider: CalendarProvider,
  origin: string,
  code: string,
): Promise<CalendarTokenSet> {
  const credentials = getCalendarCredentials(provider);
  if (!credentials) throw new Error(`${getCalendarProviderLabel(provider)} is not configured`);

  const definition = PROVIDER_DEFINITIONS[provider];
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(origin, provider),
  });

  return readTokenResponse(
    await fetch(definition.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }),
  );
}

export async function refreshCalendarAccessToken(
  provider: CalendarProvider,
  refreshToken: string,
): Promise<CalendarTokenSet> {
  const credentials = getCalendarCredentials(provider);
  if (!credentials) throw new Error(`${getCalendarProviderLabel(provider)} is not configured`);

  const definition = PROVIDER_DEFINITIONS[provider];
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  return readTokenResponse(
    await fetch(definition.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }),
  );
}

export async function fetchCalendarProfile(
  provider: CalendarProvider,
  accessToken: string,
): Promise<CalendarProfile> {
  const url =
    provider === "google"
      ? "https://www.googleapis.com/oauth2/v3/userinfo"
      : "https://graph.microsoft.com/v1.0/me";
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const body = asRecord(await response.json().catch(() => null));
  if (!response.ok || !body) return { id: null, email: null };

  if (provider === "google") {
    return {
      id: asString(body.sub),
      email: asString(body.email),
    };
  }

  return {
    id: asString(body.id),
    email: asString(body.mail) ?? asString(body.userPrincipalName),
  };
}

function normalizeDateTime(value: string | null): string | null {
  if (!value) return null;
  const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseGoogleEvent(raw: unknown): CalendarEventItem | null {
  const event = asRecord(raw);
  if (!event) return null;

  const start = asRecord(event.start);
  const end = asRecord(event.end);
  const startsAt = normalizeDateTime(
    asString(start?.dateTime) ?? asString(start?.date),
  );
  if (!startsAt) return null;

  return {
    id: asString(event.id) ?? startsAt,
    title: asString(event.summary) ?? "Untitled event",
    startsAt,
    endsAt: normalizeDateTime(asString(end?.dateTime) ?? asString(end?.date)),
    location: asString(event.location),
  };
}

function parseOutlookEvent(raw: unknown): CalendarEventItem | null {
  const event = asRecord(raw);
  if (!event) return null;

  const start = asRecord(event.start);
  const end = asRecord(event.end);
  const location = asRecord(event.location);
  const startsAt = normalizeDateTime(asString(start?.dateTime));
  if (!startsAt) return null;

  return {
    id: asString(event.id) ?? startsAt,
    title: asString(event.subject) ?? "Untitled event",
    startsAt,
    endsAt: normalizeDateTime(asString(end?.dateTime)),
    location: asString(location?.displayName),
  };
}

export async function fetchUpcomingCalendarEvents(
  provider: CalendarProvider,
  accessToken: string,
  limit: number,
): Promise<CalendarEventItem[]> {
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const headers = { authorization: `Bearer ${accessToken}` };

  if (provider === "google") {
    const url = new URL(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    );
    url.searchParams.set("timeMin", now.toISOString());
    url.searchParams.set("timeMax", horizon.toISOString());
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", String(limit));

    const response = await fetch(url, { headers });
    const body = asRecord(await response.json().catch(() => null));
    if (!response.ok || !body) throw new Error("Google Calendar events failed");

    const items = Array.isArray(body.items) ? body.items : [];
    return items.map(parseGoogleEvent).filter((item): item is CalendarEventItem => Boolean(item));
  }

  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  url.searchParams.set("startDateTime", now.toISOString());
  url.searchParams.set("endDateTime", horizon.toISOString());
  url.searchParams.set("$orderby", "start/dateTime");
  url.searchParams.set("$top", String(limit));
  url.searchParams.set("$select", "id,subject,start,end,location");

  const response = await fetch(url, { headers });
  const body = asRecord(await response.json().catch(() => null));
  if (!response.ok || !body) throw new Error("Outlook Calendar events failed");

  const items = Array.isArray(body.value) ? body.value : [];
  return items.map(parseOutlookEvent).filter((item): item is CalendarEventItem => Boolean(item));
}
