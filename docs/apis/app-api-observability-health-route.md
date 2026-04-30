# app/api/observability/health/route.ts

## Contract

`GET /api/observability/health` returns a runtime canary for log sink health.

The route records a stdout sink event for its own request, reads recent sink
stats from the in-memory ring, and reports whether configured telemetry sinks
are receiving events.

Response fields:

- `ts`: ISO timestamp for the health response.
- `sinks.stdout`: always configured and expected to report recent events while
  the server is alive.
- `sinks.langfuse`: `not-configured`, `ok`, or `silent` depending on
  Langfuse env vars and recent events.
- `sinks.supabase`: `not-configured`, `ok`, or `silent` depending on Supabase
  env vars and recent events.
- `warnings`: plain-language warnings for configured sinks that have not
  received recent events.
- `launchWatchlist.automatedNow`: existing routes and scripts that can be
  checked without new monitoring infrastructure.
- `launchWatchlist.manualAccountDashboard`: launch watchlist items Alfonso must
  check in provider dashboards, store consoles, support inboxes, or production
  logs.
- `launchWatchlist.runbook`: local runbook path for the concrete post-launch
  monitoring plan.

This route does not call paid providers and should not become an alerting
system. It is a lightweight status surface for launch operations.

## Failure Modes

- A configured Langfuse sink reports `silent` when no recent Langfuse events
  have been observed.
- A configured Supabase sink reports `silent` when no recent Supabase events
  have been observed.
- Process restart clears the in-memory recent-event ring, so the first response
  after restart can under-report non-stdout sink activity until new events flow.

## Verification

- Route implementation: `app/api/observability/health/route.ts`
- Post-launch runbook: `docs/POST_LAUNCH_MONITORING.md`
- Contract placeholder: `tests/contracts/app-api-observability-health-route.contract.test.ts`
