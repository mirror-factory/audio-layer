# Calendar Integration

Layers has a calendar connection flow for showing upcoming meetings before
recording starts.

## API Contract

- `GET /api/calendar/upcoming?limit=3`
- `GET /api/calendar/connect/google`
- `GET /api/calendar/connect/outlook`
- `GET /api/calendar/callback/[provider]`
- `POST /api/calendar/disconnect/[provider]`

## Supabase Setup

Apply:

```bash
supabase db push
```

Or paste `supabase/migrations/00004_calendar_connections.sql` into the Supabase
SQL editor.

The table is `calendar_connections`. OAuth tokens are encrypted by the app and
written only through the service-role client; browser clients never write token
fields directly.

## Environment Setup

Add these values locally and in production:

```bash
CALENDAR_TOKEN_ENCRYPTION_KEY=replace-with-a-long-random-secret

GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...

MICROSOFT_CALENDAR_CLIENT_ID=...
MICROSOFT_CALENDAR_CLIENT_SECRET=...
```

OAuth redirect URLs:

```text
http://localhost:3001/api/calendar/callback/google
http://localhost:3001/api/calendar/callback/outlook
https://your-production-domain.com/api/calendar/callback/google
https://your-production-domain.com/api/calendar/callback/outlook
```

Google scopes:

```text
openid email https://www.googleapis.com/auth/calendar.readonly
```

Microsoft scopes:

```text
openid email offline_access User.Read Calendars.Read
```

## Runtime Behavior

If no calendar is connected, the home screen shows a compact connect action.

If a calendar is connected, `/api/calendar/upcoming` decrypts the access token,
refreshes it when needed, and fetches the next events from Google Calendar or
Microsoft Graph. If credentials or the encryption key are missing, the UI
stays usable and points the user back to Settings.

## Product Behavior

- The recorder now uses the next usable calendar event title as the meeting
  title when creating a live recording session.
- Autosave and finalize preserve that title so the completed note keeps the
  user's calendar context instead of being overwritten by a generic generated
  title.
- Settings uses the next upcoming calendar event to offer exact recording
  reminders at the start, 5 minutes before, or 15 minutes before the meeting.

## Next Product Steps

- Add destination-authenticated follow-up pushes after the MCP client-pulled
  notes package has been validated in real Claude flows.
