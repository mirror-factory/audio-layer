# MCP And API Testing Guide

This project exposes meeting context through two tool surfaces:

- AI SDK tools used by the in-app chat: `searchMeetings`, `getMeetingDetails`, `listRecentMeetings`, and `codeReview`.
- MCP tools exposed at `/api/mcp/mcp`: `search_meetings`, `get_meeting`, `list_meetings`, `get_transcript`, `get_summary`, `start_recording`, and `show_meeting_dashboard`.

## MCP Auth Contract

The MCP protocol handshake is intentionally unauthenticated:

- `initialize` is allowed without a bearer token.
- `notifications/*` is allowed without a bearer token.
- `DELETE` cleanup is allowed without a bearer token.

Every data-bearing operation requires a bearer token:

- `GET /api/mcp/mcp`
- JSON-RPC `tools/list`
- JSON-RPC `tools/call`

Invalid or missing tokens return:

```json
{
  "error": "invalid_token",
  "error_description": "Bearer token required. Get your API key from the Layer One Audio profile page."
}
```

Tool handlers must close over the validated user for the current request. Do not store the authenticated user in module-level state; concurrent MCP requests can otherwise leak user context.

## MCP OAuth Contract

Layer One supports OAuth for polished MCP clients and API keys for manual
developer testing.

OAuth discovery:

- `GET /.well-known/oauth-protected-resource`
- `GET /.well-known/oauth-authorization-server`

Authorization code flow:

1. MCP client calls `/api/mcp/mcp`.
2. Layer One returns `401` with protected-resource metadata.
3. Client starts `/api/oauth/authorize` with `response_type=code`,
   `redirect_uri`, `state`, `scope=mcp:tools`, and PKCE `S256` params.
4. Layer One sends the user to `/oauth/consent`.
5. After sign-in and consent, `/api/oauth/consent` stores a one-time,
   five-minute auth code bound to `code_challenge`.
6. Client exchanges the code at `/api/oauth/token` with `code_verifier`.
7. Token response includes a one-hour access token and a rotating refresh token.

Security rules:

- Only `mcp:tools` is granted.
- `redirect_uri` must be HTTPS, except localhost loopback HTTP for development.
- Authorization codes are deleted on token exchange attempts.
- Refresh tokens are stored as SHA-256 hashes and rotate on every refresh.
- `/api/oauth/revoke` revokes refresh tokens.

Supabase setup: apply `supabase/migrations/00003_mcp_oauth.sql` before testing
OAuth token exchange against the live project. See
`docs/SUPABASE_MCP_OAUTH_SETUP.md` for dashboard and verification steps.

Claude connector testing: see `docs/CLAUDE_MCP_TESTING.md` for Claude.ai,
Claude Desktop, Claude Code, OAuth, and local API-key test paths.

## MCP Request Examples

Initialize:

```bash
curl -sS https://audio-layer.vercel.app/api/mcp/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

List tools:

```bash
curl -sS https://audio-layer.vercel.app/api/mcp/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H 'authorization: Bearer lo1_your_api_key' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Search meetings:

```bash
curl -sS https://audio-layer.vercel.app/api/mcp/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H 'authorization: Bearer lo1_your_api_key' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_meetings","arguments":{"query":"pricing decisions","limit":5}}}'
```

Show the Claude MCP App meeting dashboard:

```bash
curl -sS https://audio-layer.vercel.app/api/mcp/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H 'authorization: Bearer lo1_your_api_key' \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"show_meeting_dashboard","arguments":{"limit":12}}}'
```

## Claude MCP App UI

Claude supports MCP Apps: a tool can point to an HTML resource using MCP UI
metadata. Layer One uses that path for `show_meeting_dashboard`.

- Tool: `show_meeting_dashboard`
- UI resource: `ui://layer-one/meeting-dashboard.html`
- MIME type: `text/html;profile=mcp-app`
- Runtime package: `@modelcontextprotocol/ext-apps`
- Behavior: returns `structuredContent` for clients and an interactive meeting
  dashboard for Claude clients that render MCP Apps.

The dashboard is read-only. It lists recent meetings, status counts, and total
minutes for the bearer token's user only. The iframe refresh button calls the
same MCP tool through the host, so the UI never receives a Layer One API key.

Clients without MCP App support still receive text content:

```text
Showing 12 recent Layer One meetings.
```

### Local MCP App Preview

The HTML resource includes a preview mode so the UI can be visually checked
without Claude:

```bash
mkdir -p output/playwright
pnpm exec tsx -e "import { writeFileSync } from 'node:fs'; import { getLayerOneMeetingDashboardHtml } from './lib/mcp/ui'; writeFileSync('output/playwright/mcp-dashboard-preview.html', getLayerOneMeetingDashboardHtml(), 'utf8');"
PREVIEW_URL="file://$(pwd)/output/playwright/mcp-dashboard-preview.html?preview=1&theme=dark"
pnpm exec playwright screenshot --viewport-size=760,620 "$PREVIEW_URL" output/playwright/mcp-dashboard-preview.png
```

Use `theme=light` to capture the light version. The preview mode uses fixture
meetings only; the real Claude app still loads authenticated data through the
`show_meeting_dashboard` tool.

## Test Commands

Use these while developing:

```bash
pnpm test:contracts
pnpm test:tools
pnpm test:mcp
pnpm test:eval
pnpm test:api
```

`pnpm test:api` builds the app, starts `next start`, waits for `/api/health`, then runs the API smoke manifest against the local server.

The full release loop is:

```bash
pnpm typecheck
pnpm test
npx eslint .
ai-dev-kit tool validate
```

If `ai-dev-kit` is not installed in the local environment, use the contract tests above as the local fallback and run dev-kit validation in the environment where that binary is available.

## Adding A Route

When adding an API route:

1. Add the route implementation.
2. Add one entry in `tests/api/route-contracts.ts`.
3. Add behavior tests for auth, bad input, and primary success/failure modes.
4. Run `pnpm test:contracts`.
5. Run `pnpm test:api` before release.

The contract guard fails if any `app/api/**/route.ts` file lacks a route contract.

## Recording API Contract

The live recorder has two separate startup routes:

- `GET /api/transcribe/stream/preflight` checks quota, provider configuration,
  active pricing config, and runtime model state. It must never create a meeting
  row or mint a paid provider token.
- `POST /api/transcribe/stream/token` runs after browser microphone permission
  succeeds. It creates the meeting row, mints the temporary AssemblyAI token,
  and returns the session metadata.

Keep this separation intact so opening `/record/live` stays cheap and safe.

## Adding A Tool

When adding an AI SDK tool:

1. Add implementation metadata in `lib/ai/tools/_metadata.ts`.
2. Add a handler/schema test in `tests/tools/ai-tools.test.ts`.
3. Add an eval case in `tests/evals/tools.eval.ts`.
4. Update `.ai-dev-kit/registries/tools.yaml`.

When adding an MCP tool:

1. Add the schema and handler in `lib/mcp/tools.ts` or the MCP route.
2. Add schema and handler tests in `tests/mcp/tools.test.ts`.
3. Add protocol tests when auth behavior changes.
4. Add an eval case for every data-access tool.
5. For MCP App UI tools, register both the app tool and the HTML resource, and
   document the resource URI and CSP allowlist here.

## Notes Push Workflow

The notes-push path is trigger-based and destination-labeled, not a generic
"send everything everywhere" action. See `docs/NOTES_PUSH_WORKFLOW.md` for the
full product and safety contract.

Recommended shape:

- Trigger: meeting completed, action items detected, decision detected, or
  manual "push notes" button on the meeting detail page.
- Payload source: `get_summary`, `get_transcript`, and `get_meeting` already
  expose the necessary user-scoped data.
- Destination: start with MCP-client-pulled payloads, then add explicit
  destinations such as Linear, Notion, Slack, or email after destination auth
  exists.
- Safety rule: any tool that transmits notes out of Layer One must require a
  destination, a meeting ID, and an explicit user action or saved trigger.

Do not add an unauthenticated push endpoint. Meeting notes are private user
data, and the existing MCP auth contract should remain the boundary.

### Implemented First Step

`prepare_notes_push` is available as a read-only MCP tool. It requires:

- `meeting_id`
- `destination` (use `mcp_client` until a real destination auth flow exists)
- `trigger` (`manual_push`, `meeting_completed`, `action_items_detected`, or
  `decision_detected`)

The tool returns a scoped markdown/package payload for the authenticated user's
meeting. It does not send notes to Slack, Linear, Notion, email, or any other
third party. Destination-specific transmission should remain a separate,
explicitly authorized feature.

The app uses the same package builder on completed meeting detail pages through
`POST /api/meetings/[id]/notes-package`. That route requires the signed-in user,
validates the destination/trigger body, and returns the same markdown payload
used by MCP. The UI copies the package to the clipboard and keeps transcript
text opt-in.

Webhook destinations are managed through `/api/webhooks`. Completed-meeting
webhook deliveries now include the same compact notes package with destination
`webhook` and trigger `meeting_completed`; transcript text is excluded. Recent
delivery records are available through `GET /api/webhooks/deliveries?limit=8`
and are shown in Settings.
