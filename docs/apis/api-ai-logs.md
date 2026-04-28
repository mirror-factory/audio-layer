# API: app/api/ai-logs/route.ts

## Contract

`GET /api/ai-logs` returns an array of AI call records from the configured telemetry backend.

Supported query params:
- `userId`
- `chatId`
- `label`
- `limit`
- `since`
- `errorsOnly=true`

The local-first fallback returns `[]` when no file, memory, or Supabase telemetry exists.

## Verification

- Contract test: `tests/e2e/api-ai-logs.contract.test.ts`
- Dashboard consumer: `app/observability/page.tsx`
- Control plane consumer: `app/control-plane/page.tsx`
