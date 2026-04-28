# Claude MCP Testing

Layer One exposes a remote MCP endpoint at:

```text
/api/mcp/mcp
```

For local development, that is:

```text
http://localhost:3001/api/mcp/mcp
```

For Claude web, mobile, Cowork, or Claude Desktop remote connectors, use a
public HTTPS URL:

```text
https://YOUR_DOMAIN/api/mcp/mcp
```

Anthropic's remote connector traffic comes from Anthropic's servers, so Claude
cannot reach your machine's private `localhost`. Use a deployed Vercel URL or a
tunnel such as `ngrok http 3001` when testing from Claude's remote connector UI.

## What Is Implemented

- Remote HTTP MCP transport at `/api/mcp/mcp`.
- API-key bearer auth for manual testing.
- OAuth discovery and PKCE flow for Claude-style connectors.
- MCP App UI for `show_meeting_dashboard`.
- Tool list:
  - `search_meetings`
  - `get_meeting`
  - `list_meetings`
  - `get_transcript`
  - `get_summary`
  - `start_recording`
  - `show_meeting_dashboard`

## Required Production Environment

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MCP_JWT_SECRET`

`MCP_JWT_SECRET` signs OAuth access tokens issued by `/api/oauth/token`.
API-key auth still works through `profiles.api_key`, but Claude connector OAuth
should use a real production secret, not the development fallback.

## Claude.ai Custom Connector

Use this path for Claude web and Claude Desktop remote connector testing.

1. Deploy the app or start a tunnel to `localhost:3001`.
2. Confirm these URLs return JSON:

   ```bash
   curl -sS https://YOUR_DOMAIN/.well-known/oauth-protected-resource
   curl -sS https://YOUR_DOMAIN/.well-known/oauth-authorization-server
   ```

3. In Claude, open connector settings.
4. Add a custom connector.
5. Enter:

   ```text
   https://YOUR_DOMAIN/api/mcp/mcp
   ```

6. Connect/authenticate with your Layer One account.
7. In a Claude chat, enable the connector and ask:

   ```text
   Show my Layer One meeting dashboard.
   ```

Expected result: Claude calls `show_meeting_dashboard`. Claude clients that
support MCP Apps render the dashboard UI; other clients receive a text fallback.

## Claude Code

For Claude Code, add the remote HTTP server:

```bash
claude mcp add --transport http layer-one https://YOUR_DOMAIN/api/mcp/mcp
```

Then run this inside Claude Code:

```text
/mcp
```

Follow the OAuth browser flow. After authentication, test:

```text
Use the Layer One MCP server to list my recent meetings.
```

For local API-key testing with Claude Code, you can use a bearer header:

```bash
claude mcp add --transport http layer-one-local http://localhost:3001/api/mcp/mcp \
  --header "Authorization: Bearer lo1_YOUR_PROFILE_API_KEY"
```

Use this only for local/dev. Prefer OAuth for real Claude connector testing.

## Manual Protocol Checks

Unauthenticated data-bearing calls should fail:

```bash
curl -i http://localhost:3001/api/mcp/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Expected:

```text
HTTP/1.1 401 Unauthorized
www-authenticate: Bearer resource_metadata="http://localhost:3001/.well-known/oauth-protected-resource"
```

Authenticated tool listing:

```bash
curl -sS http://localhost:3001/api/mcp/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H 'authorization: Bearer lo1_YOUR_PROFILE_API_KEY' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Expected: a `tools` response containing the seven tools listed above.

## Local UI Preview

Preview the MCP App HTML outside Claude:

```bash
mkdir -p output/playwright
pnpm exec tsx -e "import { writeFileSync } from 'node:fs'; import { getLayerOneMeetingDashboardHtml } from './lib/mcp/ui'; writeFileSync('output/playwright/mcp-dashboard-preview.html', getLayerOneMeetingDashboardHtml(), 'utf8');"
PREVIEW_URL="file://$(pwd)/output/playwright/mcp-dashboard-preview.html?preview=1&theme=dark"
pnpm exec playwright screenshot --viewport-size=760,620 "$PREVIEW_URL" output/playwright/mcp-dashboard-preview.png
```

## Verification Commands

```bash
pnpm test:mcp
pnpm test:contracts
TEST_BASE_URL=http://localhost:3001 PLAYWRIGHT_DISABLE_VIDEO=1 pnpm exec playwright test tests/e2e/api-control-plane.contract.test.ts tests/e2e/ai-debug-panel.visual.test.ts --project=desktop-light
```

## References

- Claude custom remote MCP connectors: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- Claude connectors overview and MCP Apps support: https://claude.com/docs/connectors/overview
- Claude Code MCP setup: https://code.claude.com/docs/en/mcp
- MCP Apps getting started: https://claude.com/docs/connectors/building/mcp-apps/getting-started
