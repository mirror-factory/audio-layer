# Expect flow: app/observability/page.tsx

Open `/observability`.

Verify:
- The AI observability dashboard loads without raw JSON crashes.
- Logs, errors, stats, cost, token, tool, and session panels show valid empty states before AI calls exist.
- API-backed dashboard data refreshes without exposing environment secret values.
- The page is usable on desktop and mobile.
