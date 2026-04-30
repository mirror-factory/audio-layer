# app/api/meetings/[id]/export/route.ts

Exports a stored meeting as a downloadable file. The route is intentionally
small: it loads one meeting from the meetings store, converts it with
`meetingToMarkdown`, and returns either Markdown or the current HTML fallback
used for `format=pdf`.

## Request

- Method: `GET`
- Path: `/api/meetings/:id/export`
- Route params: `id` is required.
- Query params:
  - `format=md` exports Markdown. This is the default when `format` is omitted.
  - `format=pdf` returns downloadable HTML using the same Markdown content.
    This is a PDF-compatible fallback, not a binary PDF renderer.
- Auth mode: user route. Local tests call the handler directly with a mocked
  meetings store; deployed access should stay behind the same app auth boundary
  as the meeting detail route.

## Successful Responses

### Markdown

- Status: `200`
- `Content-Type`: `text/markdown; charset=utf-8`
- `Content-Disposition`: `attachment; filename="<date>-<meeting-slug>.md"`
- Body: Markdown with title, date, optional duration, summary, key points,
  action items, decisions, intake fields, and transcript.

### PDF Format Fallback

- Status: `200`
- `Content-Type`: `text/html; charset=utf-8`
- `Content-Disposition`: `attachment; filename="<date>-<meeting-slug>.html"`
- Body: HTML generated from the Markdown export. The client can download this
  today; replacing it with a true PDF renderer must preserve the same
  status/header contract or update the contract test.

## Error Behavior

- Missing route id: `400` with `{ "error": "Missing id" }`.
- Unknown meeting id: `404` with `{ "error": "Meeting not found" }`.
- Unsupported `format`: `400` with
  `{ "error": "Unsupported format: <format>. Use 'md' or 'pdf'." }`.
- Store/runtime failure: `500` through `withRoute`, with
  `{ "error", "requestId", "traceId" }` and the propagated `x-request-id`
  response header.

## Provider Dependencies

- Meetings store via `getMeetingsStore()`.
- Export conversion helpers in `lib/meetings/export.ts`.
- No transcription, LLM, calendar, Stripe, or external provider call is made by
  this route.

## Companion Proof

- Integration behavior:
  `tests/integration/app-api-meetings-id-export-route.test.ts`
- Failure modes:
  `tests/integration/app-api-meetings-id-export-route.failure-modes.test.ts`
- Request/response contract:
  `tests/contracts/app-api-meetings-id-export-route.contract.test.ts`
