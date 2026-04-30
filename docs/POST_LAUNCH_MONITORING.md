# Post-Launch Monitoring And Watchlist

**Owner:** Alfonso
**Agent scope:** Agent F, post-launch monitoring and watchlist
**Last updated:** 2026-04-30
**Launch posture:** Use existing health endpoints, logs, dashboards, tests, and manual review. Do not add new monitoring infrastructure for this launch pass.

## Operating Cadence

Use this cadence for the first public launch window:

| Window         | Cadence            | What to do                                                                                            |
| -------------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| First 2 hours  | Every 15 minutes   | Check health endpoints, Stripe events, failed recordings, sign-in errors, and provider dashboards.    |
| First 24 hours | Hourly while awake | Review the watchlist table below and log every incident with owner, user, request ID, and resolution. |
| Days 2-7       | Twice daily        | Review cost, quota, recordings, auth, store feedback, and funnel requests.                            |
| After day 7    | Weekly             | Keep store reviews, funnel requests, and provider cost review in the normal launch retro.             |

Escalate immediately when a user cannot sign in, pay, record, or retrieve a completed meeting.

## Automated Checks Available Now

These checks are already available from repo routes or scripts. They are lightweight and do not require new infrastructure.

| Area                     | Check                                                                                       | Source                                                                                         | Escalate when                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Observability sinks      | Confirm runtime logs are flowing to stdout and any configured Langfuse/Supabase sink.       | `GET /api/observability/health`                                                                | A configured sink reports `silent` or warnings are non-empty.                                  |
| Dependency liveness      | Confirm Supabase, Langfuse, and AssemblyAI dependency health.                               | `GET /api/health`                                                                              | Any configured dependency reports `down` or repeated `degraded`.                               |
| AI errors                | Review summary/chat/model failures.                                                         | `GET /api/ai-logs/errors?limit=50` and `/observability` Errors tab                             | New launch-time errors appear, especially summary generation, model routing, or tool failures. |
| AI cost trend            | Review token cost, model mix, and error rate.                                               | `GET /api/ai-logs/stats?since=<iso>` and `/observability` Charts tab                           | Cost jumps without matching usage, error rate rises, or model mix changes unexpectedly.        |
| Provider usage events    | Review recorded external calls and cost events.                                             | `.ai-starter/runs/integration-usage.jsonl`, `pnpm usage:check`                                 | External spend is missing for a paid path or an integration shows repeated `error`.            |
| Recording preflight      | Confirm quota, provider, pricing, and runtime model readiness before paid recording starts. | `GET /api/transcribe/stream/preflight`                                                         | Status is `blocked`, provider is missing, or runtime model status is not launch-expected.      |
| Webhook delivery records | Check user-configured webhook delivery status.                                              | `GET /api/webhooks/deliveries?limit=25` for signed-in users                                    | Recent deliveries show `success: false` or repeated non-2xx status codes.                      |
| Mobile visual regression | Run the existing mobile and visual Playwright suites.                                       | `pnpm test:visual:mobile`, `pnpm test:mobile`, `pnpm test:e2e tests/e2e/mobile-polish.spec.ts` | Screenshot diff fails, horizontal overflow appears, or sign-in/recording controls disappear.   |
| Static/code health       | Run focused checks after monitoring doc or route changes.                                   | `pnpm typecheck` or focused Vitest/Playwright commands                                         | Typecheck fails or a touched route loses its response contract.                                |

## Manual And Account-Dashboard Checks Alfonso Must Do

These checks require account access, production dashboards, customer inboxes, or store consoles.

| Area                      | Manual source                                                                             | Cadence                                                         | What to capture                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Stripe webhook failures   | Stripe Dashboard -> Developers -> Webhooks -> production endpoint                         | Every 15 minutes for first 2 hours, then hourly for day 1       | Failed event ID, event type, HTTP status, response body, affected customer, and whether replay succeeds.                            |
| Stripe subscription drift | Stripe Dashboard customers/subscriptions plus Supabase `profiles` row                     | Hourly on day 1 after any checkout                              | Stripe customer ID, subscription status/tier, Supabase profile status/tier, and mismatch reason.                                    |
| Failed recordings         | Vercel logs, Supabase meetings table, support inbox, and user reports                     | Every 15 minutes for first 2 hours, then hourly for day 1       | User, meeting ID, route request ID, browser/native shell, provider, recorder state, local draft availability, and recovery outcome. |
| Provider cost spikes      | AssemblyAI dashboard, Vercel AI Gateway usage, Supabase project usage, Stripe fee reports | Twice daily for first week                                      | Daily spend, usage unit, active users, average cost per recording, and variance from launch model.                                  |
| Quota false positives     | Support inbox, `/usage`, Supabase profiles/meetings, pricing config                       | Hourly on day 1, then daily                                     | User, plan, meeting count, monthly minutes, preflight response, whether `LAYERS_BYPASS_QUOTA` was involved, and resolution.         |
| Sign-in errors            | Supabase Auth logs, Vercel logs, OAuth provider console, support inbox                    | Every 15 minutes for first 2 hours, then hourly for day 1       | Provider, error message, redirect URL, user email/domain, browser, and whether password or Google sign-in failed.                   |
| Store review feedback     | App Store Connect and Google Play Console review notes                                    | Daily while any build is in review                              | Store, build number, rejection category, exact required change, owner, and resubmission time.                                       |
| Mobile visual regression  | Real device smoke on iPhone, iPad, Android, and small browser width                       | Daily for first week and after landing/download/pricing changes | Screenshot, route, device/browser, viewport, issue class, and whether Playwright caught it.                                         |
| Funnel requests           | Support inbox, waitlist form, DMs, sales calls, launch comments, Linear                   | Twice daily for first week                                      | Requester, company, source, desired integration/workflow, urgency, willingness to pay, and follow-up owner.                         |

## Launch Watchlist

### Stripe Webhook Failures

Expected current signals:

- Route exists at `POST /api/stripe/webhook`.
- Webhook route returns explicit 503 for missing Stripe config or webhook secret.
- Invalid signatures return 400.
- Production failures must be confirmed in Stripe Dashboard because Stripe delivery attempts and replay controls live there.

Escalation:

- More than one failed production webhook in 30 minutes.
- Any `checkout.session.completed` event that does not update the user profile subscription state.
- Any subscription delete/update event that cannot be mapped to a plan tier.

Immediate response:

1. Copy the Stripe event ID and request ID.
2. Confirm `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_CORE`, and `STRIPE_PRICE_PRO`.
3. Replay the Stripe event after the fix.
4. Verify the Supabase `profiles` row matches Stripe.

### Failed Recordings

Expected current signals:

- `/api/transcribe/stream/preflight` reports quota, provider configuration, pricing, and runtime model readiness before paid recording starts.
- The recorder has local draft safety for browser refreshes, network drops, and provider interruptions.
- Autosave/finalize routes should show `route.error` logs when they fail.

Escalation:

- Any user ends a real recording and cannot open a transcript or meeting detail.
- Two failed finalizations in an hour.
- Any provider outage that leaves users without clear recovery instructions.

Immediate response:

1. Ask for the meeting ID, browser/device, and approximate timestamp.
2. Check Vercel logs for `route.error` on transcribe routes.
3. Check whether the user's local draft is still present on the device.
4. If the meeting row is empty, preserve all available transcript text before retrying or deleting anything.

### Provider Cost Spikes

Expected current signals:

- AI model costs are visible through `/api/ai-logs/stats` and `/observability`.
- External integration usage is recorded in `.ai-starter/runs/integration-usage.jsonl` when paths use `trackedFetch` or explicit usage recording.
- Some provider costs still require account dashboards.

Escalation:

- Daily provider spend exceeds the launch model by 25%.
- Average cost per 30-minute recording exceeds the expected plan economics.
- AI model mix shifts to a more expensive model without a release note.

Immediate response:

1. Compare `/observability` model cost with provider dashboards.
2. Separate transcription spend from summarization/chat spend.
3. Identify the route, model, user, and recording length responsible for the change.
4. If spend is unexplained, pause paid funnel expansion until the route or provider is understood.

### Quota False Positives

Expected current signals:

- `/api/transcribe/stream/preflight` includes quota status and plan ID.
- Quota intentionally fails open on transient Supabase errors.
- Local bypass mode exists but should not be used in production unless explicitly allowed.

Escalation:

- Any paid user is blocked from recording by quota.
- More than one free user reports incorrect meeting/minute usage in a day.
- Production has quota bypass enabled unintentionally.

Immediate response:

1. Capture the preflight response.
2. Compare Supabase meeting rows, monthly minutes, and profile subscription tier.
3. Check active pricing config limits.
4. Remove unintended production bypass flags or correct the affected profile/usage state.

### Sign-In Errors

Expected current signals:

- `/sign-in` supports Google OAuth plus email/password.
- Supabase client misconfiguration surfaces as `Auth not configured` in the UI.
- Server-side auth API errors should appear in Vercel/Supabase logs.

Escalation:

- Any user cannot complete first sign-in.
- Google OAuth redirect/callback fails after a production deploy.
- Password sign-in works but Google sign-in fails, or the reverse.

Immediate response:

1. Capture the exact UI error, URL, and provider.
2. Check Supabase Auth provider configuration and redirect URLs.
3. Check Vercel env vars for Supabase public URL and anon key.
4. Test `/sign-in` and `/sign-up` on mobile and desktop.

### Mobile Visual Regression Watch

Expected current signals:

- Mobile Playwright coverage exists for sign-in, sign-up, home, recording controls, safe-area utilities, and pricing admin controls.
- Visual regression coverage exists for the home route across mobile, tablet, and desktop.

Escalation:

- Primary CTA, sign-in controls, pricing action, download action, or recorder controls are clipped or missing.
- Any mobile route gets horizontal overflow.
- Store screenshots no longer match the product surface after launch changes.

Immediate response:

1. Run `pnpm test:visual:mobile` and `pnpm test:e2e tests/e2e/mobile-polish.spec.ts`.
2. Capture real-device screenshots for any failed launch route.
3. Record whether the issue affects web, native shell, or both.

### Store Review Feedback Cadence

Expected current signals:

- Store submission status is manual in App Store Connect and Google Play Console.
- The launch checklist tracks privacy policy, terms, account deletion, privacy nutrition, Data Safety, and permission language.

Escalation:

- Any rejection related to recording consent, account deletion, data safety, privacy policy, microphone usage, or app metadata.
- Any build stuck in review longer than the expected store-review window for the current submission.

Immediate response:

1. Copy the store feedback verbatim into the launch incident log.
2. Assign a repo owner only if the fix is code/docs; otherwise keep it Alfonso-owned.
3. Confirm whether the change affects web copy, native metadata, legal pages, or store-console answers.

### Funnel Requests

Expected current signals:

- The launch checklist already names likely requests: calendar, Gmail, Outlook, Slack, Linear, Notion, MCP setup, and transcription quality options.
- These requests will mostly arrive in inboxes, calls, DMs, comments, or Linear rather than app telemetry.

Escalation:

- Three or more qualified users ask for the same integration or workflow in a week.
- A paid or high-intent lead is blocked by a missing integration.
- Users repeatedly misunderstand minutes, plans, or why recording is bot-free.

Immediate response:

1. Log each request with source, customer segment, workflow, and willingness-to-pay signal.
2. Tag the request as `integration`, `pricing`, `quality`, `workflow`, `privacy`, or `distribution`.
3. Convert repeated high-intent requests into Linear issues and link them from the launch retro.

## Incident Log Template

Use this shape in Linear, a spreadsheet, or the launch retro:

```text
Time:
Area:
Severity: P0/P1/P2/P3
User/account:
Route or dashboard source:
Request ID / Stripe event ID / meeting ID:
Symptom:
Impact:
Immediate action:
Owner:
Resolved at:
Follow-up:
```

## Focused Verification

Run these when this document or the health route changes:

```bash
pnpm typecheck
pnpm test:e2e tests/e2e/mobile-polish.spec.ts
pnpm test:visual:mobile
pnpm usage:check
```

If the worktree is shared and dirty, run only the smallest check that validates the touched surface and note any skipped broader gates in the handoff.
