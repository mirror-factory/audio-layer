# app/api/meetings/[id]/notes-package/route.ts

## Purpose

`POST /api/meetings/[id]/notes-package` builds a portable JSON + markdown
package for pushing a meeting into another AI tool, MCP client, clipboard flow,
or internal automation. It is intentionally server-side: clients ask for a
package, and the route loads the meeting from the authenticated meeting store.

## Authentication

The route requires a signed-in user through `getCurrentUserId()`.

- unauthenticated requests return `401 { "error": "Authentication required" }`
- the meeting store must remain user-scoped so a caller cannot request another
  user's meeting by id
- no package is generated before auth and request validation pass

## Request

```json
{
  "destination": "agent_clipboard",
  "trigger": "manual_push",
  "include_transcript": false
}
```

Fields:

- `destination`: required string, 1-80 characters. This is a label for the
  target that will receive the package, such as `agent_clipboard`,
  `claude_mcp`, or a webhook destination.
- `trigger`: optional enum. Defaults to `manual_push`. Supported values:
  `manual_push`, `meeting_completed`, `action_items_detected`,
  `decision_detected`.
- `include_transcript`: optional boolean. Defaults to `false`. When `true`, the
  response includes transcript text in both `markdown` and `payload.transcript`.

## Response

Success returns JSON:

```json
{
  "ready": true,
  "meetingId": "meeting_123",
  "title": "Product Planning",
  "trigger": "manual_push",
  "destination": "agent_clipboard",
  "generatedAt": "2026-04-29T20:00:00.000Z",
  "actionItemCount": 2,
  "decisionCount": 1,
  "markdown": "# Product Planning\n...",
  "payload": {
    "summary": {},
    "intakeForm": null,
    "actionItems": [],
    "decisions": [],
    "transcript": "optional transcript text"
  }
}
```

The markdown package is sectioned for AI ingestion:

- title and summary
- key points
- decisions
- action items, including assignee and due date when available
- intake context
- transcript only when explicitly requested

## Error Behavior

- `400`: missing route id or invalid request body
- `401`: no authenticated user
- `404`: authenticated user, valid body, but no meeting exists for that id
- `500`: store failures are wrapped by `withRoute` as
  `{ error, requestId, traceId }`

Every response receives the shared `x-request-id` header from `withRoute`.

## Provider Dependencies

This route has no live LLM, transcription, calendar, Stripe, or webhook provider
dependency. It only reads the meeting store and formats already-generated
meeting data.

## Companion Proof

Behavior coverage:

- `tests/integration/app-api-meetings-id-notes-package-route.test.ts`
- `tests/integration/app-api-meetings-id-notes-package-route.failure-modes.test.ts`
- `tests/contracts/app-api-meetings-id-notes-package-route.contract.test.ts`

Run:

```bash
pnpm exec vitest run \
  tests/integration/app-api-meetings-id-notes-package-route.test.ts \
  tests/integration/app-api-meetings-id-notes-package-route.failure-modes.test.ts \
  tests/contracts/app-api-meetings-id-notes-package-route.contract.test.ts
```
