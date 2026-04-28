# API: app/api/ai-logs/errors/route.ts

## Contract

`GET /api/ai-logs/errors` returns an array of AI error records.

Supported query params:
- `userId`
- `source`
- `limit`
- `since`

The endpoint must return a valid empty array when no errors exist.

## Verification

- Contract test: `tests/e2e/api-ai-logs-errors.contract.test.ts`
- Dashboard consumer: `app/observability/page.tsx`
- Control plane consumer: `app/control-plane/page.tsx`
