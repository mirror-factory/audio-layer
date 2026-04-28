# Notes Push Workflow

Layer One now has a first-step handoff workflow for getting meeting notes into
AI tools without silently sending private data away from the app.

## Product Shape

The workflow has two modes:

- Meeting detail UI: users can copy a clean notes package from a completed
  meeting.
- MCP/API access: authenticated tools can prepare the same package for a
  specific destination label.

This is intentionally a package builder, not an automatic sender. Slack, Linear,
Notion, email, and CRM pushes should be added only after each destination has its
own explicit auth, consent, and event configuration.

## User-Facing Component

`components/meeting-notes-push-panel.tsx` appears on completed meeting detail
pages after the intelligence panel.

It provides:

- A single "Copy package" action.
- Optional transcript inclusion.
- Clipboard copy with a manual textarea fallback.
- Copy that avoids provider, MCP, and billing language.

The component posts to `/api/meetings/[id]/notes-package` and never talks to a
third-party integration directly.

## API Contract

`POST /api/meetings/[id]/notes-package`

Auth: signed-in user.

Body:

```json
{
  "destination": "agent_clipboard",
  "trigger": "manual_push",
  "include_transcript": false
}
```

Response:

```json
{
  "ready": true,
  "meetingId": "meeting_1",
  "title": "Launch review",
  "trigger": "manual_push",
  "destination": "agent_clipboard",
  "actionItemCount": 1,
  "decisionCount": 1,
  "markdown": "# Launch review\n...",
  "payload": {
    "summary": {},
    "intakeForm": {},
    "actionItems": [],
    "decisions": []
  }
}
```

Invalid auth returns `401`, malformed request bodies return `400`, and missing
meetings return `404`.

## Shared Builder

`lib/notes-push.ts` is the source of truth for the notes package. It is reused
by:

- `prepare_notes_push` in `lib/mcp/tools.ts`
- `/api/meetings/[id]/notes-package`
- Future destination workers

Keep formatting rules here so MCP, app UI, and future webhook workers package
meetings consistently.

## Settings Integrations Surface

`components/integrations-settings-panel.tsx` adds the first user-facing
integration management surface under `/settings#integrations`.

It currently covers:

- Agent access links for API-key/MCP setup.
- Webhook URL registration.
- Event selection for `meeting.completed` and `meeting.error`.
- Optional signing secret storage.
- Delete controls for existing webhooks.
- Recent delivery status for webhook debugging.

Completed-meeting webhooks include the compact notes package by default:
summary, key points, decisions, action items, and intake context. Transcript
text is not sent through webhooks.

Supabase must have `supabase/migrations/00005_webhooks.sql` applied before the
panel can persist live webhooks or list deliveries. Until then, the API returns
`503` and the UI shows a setup message.

## Webhook Payload

`meeting.completed` payloads follow this shape:

```json
{
  "event": "meeting.completed",
  "meetingId": "meeting_1",
  "timestamp": "2026-04-27T00:00:00.000Z",
  "data": {
    "title": "Launch review",
    "durationSeconds": 1800,
    "hasSummary": true,
    "hasIntake": true,
    "costUsd": 0.03,
    "notesPackage": {
      "ready": true,
      "destination": "webhook",
      "trigger": "meeting_completed",
      "markdown": "# Launch review\n..."
    }
  }
}
```

If a webhook has a signing secret, deliveries include
`X-Webhook-Signature: sha256=<hex-hmac>` over the exact JSON request body.

`GET /api/webhooks/deliveries?limit=8` returns recent delivery records scoped to
the signed-in user's webhook IDs.

## Safety Rules

- Do not add unauthenticated notes-package endpoints.
- Do not transmit notes to external systems from the copy panel.
- Do not make transcript inclusion the default.
- Do not add broad "send everything everywhere" actions.
- Every destination sender needs a saved destination, user-owned auth, and a
  trigger that the user explicitly chose.

## Tests

Primary coverage:

- `tests/notes-push.test.ts`
- `tests/mcp/tools.test.ts`
- `tests/api-route-behavior.test.ts`
- `tests/api/route-contracts.ts`
- `tests/webhooks-fire.test.ts`

Run:

```bash
pnpm test -- tests/notes-push.test.ts tests/mcp/tools.test.ts tests/api-route-behavior.test.ts tests/webhooks-fire.test.ts
pnpm test:contracts
```
