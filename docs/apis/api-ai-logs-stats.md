# API: app/api/ai-logs/stats/route.ts

## Contract

`GET /api/ai-logs/stats` returns aggregate telemetry for AI usage, tokens, cost, time-to-first-token, error rate, abort rate, model breakdown, daily series, tool frequency, and sessions.

The local-first fallback returns numeric zeroes, empty objects, and empty arrays when no AI logs exist.

## Verification

- Contract test: `tests/e2e/api-ai-logs-stats.contract.test.ts`
- Dashboard consumer: `app/observability/page.tsx`
- Control plane consumer: `app/control-plane/page.tsx`
