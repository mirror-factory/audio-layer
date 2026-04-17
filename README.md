# audio-layer

The first standalone product built on the Layers platform by The Near Factory.

Bootstrapped from [mirror-factory/vercel-ai-starter-kit](https://github.com/mirror-factory/vercel-ai-starter-kit) — Next.js 15 + AI SDK v6 + TypeScript + Tailwind v4 + pnpm, with Langfuse observability, Claude Code hooks, registries, and enforcement gates.

## Quickstart

```bash
pnpm install
cp .env.example .env.local   # fill in AI_GATEWAY_API_KEY, ASSEMBLYAI_API_KEY, LANGFUSE_*, SUPABASE_*
pnpm dev
```

Optional — set up Supabase persistence + auth (otherwise runs
against an in-memory dev store; state lost on redeploy):

```bash
# 1. In the Supabase SQL Editor, run:
cat lib/supabase/schema.sql
# Or:
psql "$SUPABASE_DB_URL" -f lib/supabase/schema.sql

# 2. Enable Anonymous Sign-Ins:
#    Supabase dashboard → Authentication → Providers →
#    "Allow anonymous sign-ins" = ON
```

When Supabase is configured, every visitor gets an anonymous user id
on first request (via `middleware.ts`). RLS policies on the
`meetings` table enforce per-user isolation automatically — no UI
sign-in flow yet. Real sign-in (email magic link / OAuth) can be
added later without breaking existing rows; Supabase supports
upgrading anonymous accounts in place via `linkIdentity()`.

Then open:
- http://localhost:3000 — Hub
- http://localhost:3000/record — batch mode (upload or record audio)
- http://localhost:3000/record/live — streaming mode (u3-rt-pro, live captions)
- http://localhost:3000/meetings — recent recordings (persisted)
- http://localhost:3000/meetings/[id] — single meeting detail
- http://localhost:3000/chat — reference chat with tool calls
- http://localhost:3000/observability — AI call logs / costs / errors

## Gates

```bash
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest (unit + registry-sync)
pnpm compliance  # 12 automated checks from the starter kit
pnpm build       # next build
pnpm lint        # eslint flat config
```

Husky pre-commit runs typecheck + test; pre-push re-runs them plus compliance.

## What's wired

- **AI SDK v6** via `@ai-sdk/gateway` — routing, fallbacks, semantic caching
- **Langfuse OTEL** — auto-tracing for every `generateText` / `streamText` call (see `instrumentation.ts` + `lib/langfuse-setup.ts`)
- **Telemetry middleware** — `withTelemetry()` wraps AI calls, feeds the `/observability` dashboard
- **Tool registry** — `lib/ai/tool-meta.ts` single source of truth, enforced by registry-sync tests
- **Claude Code hooks** — `.claude/hooks/*.py` for session startup, reground, format
- **Skills** — `.claude/skills/*` for observability-debug, wire-telemetry, compliance-fix, visual-qa, context7-first
- **Nightly CI** — `.github/workflows/nightly.yml`
- **Playwright** — smoke, visual-regression, mobile
- **Research cache** — `.claude/research/` with freshness enforcement

## Product stack (locked)

| Layer | Choice |
|---|---|
| Web app (core) | Next.js 15 + AI SDK v6, hosted on Vercel |
| iOS + Android | Capacitor wrapping the static-exported web app + native audio plugins |
| macOS + Windows | Tauri (not Electron) — thin OS-webview shell, Rust bridge for system audio (Core Audio / ScreenCaptureKit / WASAPI) |
| Transcription — streaming | **AssemblyAI Universal-3 Pro** (`u3-rt-pro`, wss://api.assemblyai.com/v3/realtime/ws) — direct, not via Gateway |
| Transcription — batch | **AssemblyAI Universal-3 Pro** (`speech_model: 'best'`) — direct, not via Gateway |
| Summary LLM | Vercel AI Gateway (default `anthropic/claude-sonnet-4-6`) |
| Observability | Langfuse OTEL (auto-traces every LLM call) + in-app `/observability` dashboard |

All front-ends (web, mobile, desktop) call the same hosted `https://<app>.vercel.app/api/*` routes. Audio capture is native per-platform; uploads/streams go to the server-side AssemblyAI integration.

## V1 pipeline (shipped)

```
/record
  └→ POST /api/transcribe        (AssemblyAI upload + submit, insert Meetings row)
  └→ GET  /api/transcribe/[id]   (poll every 3s; on completion: summarize + persist)
  └→ redirect /meetings/[id]     (detail view)

/meetings             — list, most recent first
/meetings/[id]        — speaker-segmented transcript + structured summary
                         (while processing, polls until terminal, then refresh)
GET /api/meetings       → MeetingListItem[]
GET /api/meetings/[id]  → Meeting
```

- **Transcription** — AssemblyAI Universal-3 Pro batch (`speech_model: 'best'`, `speaker_labels`, `entity_detection`). Direct, not via the Gateway.
- **Summary** — Gateway Claude Sonnet 4.6 via `generateObject(MeetingSummarySchema)`: `title`, `summary`, `keyPoints`, `actionItems`, `decisions`, `participants`.
- **Persistence** — `meetings` table in Supabase (`lib/supabase/schema.sql`). If `SUPABASE_URL` is unset, falls back to an in-memory store for zero-setup local dev.
- **Observability** — every LLM call goes through `withTelemetry()` → Langfuse + `/observability`.

## V2 pipeline — streaming (shipped)

```
/record/live
  └→ POST /api/transcribe/stream/token        (mint ephemeral token,
                                               insert Meetings row)
  └→ AudioContext + AudioWorklet              (48k mic → 16k PCM int16)
  └→ wss://api.assemblyai.com/v3/realtime/ws  (direct browser connection
                                               with the temp token, model
                                               u3-rt-pro, speakerLabels)
  └→ Turn events                              (partial + final; partial
                                               updates the live UI, final
                                               appends to transcript)
  └→ Stop button
      └→ POST /api/transcribe/stream/finalize (summarize via Gateway,
                                               persist via MeetingsStore)
      └→ redirect /meetings/[id]
```

- Browser never sees the AssemblyAI API key — only short-lived tokens (10 min TTL, max 1 hr session).
- AudioWorklet is served from `public/worklets/pcm-downsampler.js`; pre-filtered by a BiquadFilter low-pass at 7 kHz to prevent decimation aliasing.
- Browser mic only for V1. System-audio capture requires native bridges — comes with the Tauri shell.

## Export

`/meetings/[id]` has an "Export Markdown" button (`GET /api/meetings/[id]/export?format=md`). Output is GitHub-flavored Markdown with action items rendered as `- [ ]` checkboxes. PDF is deferred — use the browser's Print → Save as PDF on the detail page until we add a server-side renderer.

## Intake-form extraction

Every completed meeting (batch and streaming) now also runs through `extractIntakeForm()` — a second `generateObject` call against `IntakeFormSchema`: intent, primary participant, organization, contact info, budget, timeline, decision makers, requirements, pain points, next steps. Both calls run in parallel via `Promise.allSettled` so a failure in one doesn't block the other. The intake panel renders on `/meetings/[id]` only when at least one field has content; the prompt explicitly tells the LLM to leave fields blank rather than invent CRM data.

## Pricing & billing

`/pricing` shows Free / Core $15 / Pro $25 tiers (matches the product brief). Subscribe buttons hit `POST /api/stripe/checkout` and redirect to Stripe-hosted Checkout. Webhook at `POST /api/stripe/webhook` validates signatures and syncs subscription state into the `profiles` table.

For local dev:

```bash
# Install Stripe CLI then:
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the printed whsec_* into STRIPE_WEBHOOK_SECRET.
# Create monthly products + prices for Core $15 and Pro $25 in the
# Stripe dashboard, then drop the price ids into STRIPE_PRICE_CORE
# and STRIPE_PRICE_PRO.
```

The meeting routes are NOT paywalled yet — that ships when we have real customers and a clear "free 25 meetings" cutoff to enforce.

## Next up

Tauri shell with native system-audio capture (Core Audio / ScreenCaptureKit / WASAPI). Then Capacitor for iOS/Android mic-only.
