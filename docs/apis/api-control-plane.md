# API: app/api/control-plane/route.ts

## Contract

`GET /api/control-plane` returns the local starter control-plane payload.

`POST /api/control-plane` accepts `{ "actionId": "score" }` and runs a dev-only allowlisted dashboard action. It never accepts raw shell commands. Browser-oriented actions receive the request origin as `AI_STARTER_BASE_URL`/`PLAYWRIGHT_BASE_URL` so the dashboard can test the app instance the user is actually viewing.

The response includes:
- install manifest and enabled modules
- registry counts
- feature and companion coverage
- latest plan and scorecard
- hook telemetry
- browser proof, Expect flows, screenshots, and replay paths
- integration and adapter status
- supervisor/tmux session state
- dev-only dashboard actions and recent action runs
- latest evidence export state and download path

Current allowlisted actions cover registry sync, setup refresh, product validation refresh, score generation, gates, browser proof, tool rubrics, design drift, the control-plane API contract, direct API usage proof, and evidence export.

The route must work without Supabase, hosted telemetry, or external services.
Dashboard actions are disabled in production and when `AI_STARTER_DISABLE_DASHBOARD_ACTIONS=1`.

`GET /api/control-plane/evidence-export` downloads the latest bundle created by the `export-evidence` action or `pnpm evidence:export`.

## Verification

- Contract test: `tests/e2e/api-control-plane.contract.test.ts`
- Browser proof: `pnpm browser:proof`
- Dashboard route: `app/control-plane/page.tsx`
- Action ledger: `.ai-starter/runs/control-plane-actions.jsonl`
