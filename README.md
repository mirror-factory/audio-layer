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

`/meetings/[id]` exports the recording in two formats:

- **Markdown** — `GET /api/meetings/[id]/export?format=md`. GitHub-flavored, action items as `- [ ]` checkboxes.
- **PDF** — `GET /api/meetings/[id]/export?format=pdf`. Server-rendered with `@react-pdf/renderer`; same sections and ordering as the Markdown output. Lazy-loaded so the heavier PDF deps don't slow the Markdown path.

## Cost + usage visibility

Every completed meeting stores a `cost_breakdown` row containing:

- STT: mode (batch/streaming), model, duration, rate/hour, base + add-on cost
- LLM: one record per call (summary, intake) with model, input/output tokens, cached tokens, computed cost
- Total USD for the meeting

Two surfaces:

- **`/meetings/[id]`** — per-meeting cost panel with 3 headline tiles (STT, LLM, Total) and a table of LLM calls.
- **`/usage`** — lifetime + this-month totals: meetings, minutes, STT spend, LLM spend, free-tier remaining, subscription status. LLM numbers overlay from Langfuse when configured and it reports traces for the user; otherwise falls back to locally-computed cost.

Pricing tables live in `lib/billing/llm-pricing.ts` and `lib/billing/assemblyai-pricing.ts` — review quarterly against published rates.

### Langfuse serverless flush

`lib/langfuse-setup.ts` exports `flushLangfuse()`. Every AI-calling route ends with `after(flushLangfuse)` — without this, Vercel's serverless cold-freeze drops buffered OTel spans and Langfuse shows zero tokens / zero cost even though traces arrive. This is the documented fix from [langfuse.com/docs/integrations/vercel-ai-sdk](https://langfuse.com/docs/integrations/vercel-ai-sdk).

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

## Mobile shell (Capacitor)

`capacitor.config.ts` + `mobile/README.md` set up an iOS + Android
WebView wrapper around the live hosted Next.js app. The native
`ios/` and `android/` projects are gitignored and regenerated
per-workstation with `npx cap add ios` / `npx cap add android`
(needs Xcode and the Android SDK respectively). Mic capture works
through the WebView's `getUserMedia`; system audio is structurally
limited on iOS and best-effort via `MediaProjection` on Android.

## Desktop shell (Tauri scaffold)

`src-tauri/` is a minimal Tauri 2.x scaffold that wraps the hosted
Next.js app in an OS webview for macOS / Windows / Linux. **Native
system-audio capture is not implemented yet** — the Rust commands
return a "not implemented" error on purpose, so the browser fallback
(mic-only via AudioWorklet on `/record/live`) keeps working.

To develop the shell:

```bash
cargo install tauri-cli --version "^2.0"
cargo tauri dev   # starts pnpm dev + opens the native window
```

See `src-tauri/README.md` for the platform-specific audio roadmap
(ScreenCaptureKit on macOS, WASAPI loopback on Windows,
PulseAudio/PipeWire monitor on Linux).

## Next up

Real native audio bridges in the Tauri shell. Capacitor for iOS/Android (mic-only). Real sign-in (email magic link / OAuth). Paywall the meeting routes once the free-tier cutoff is decided.
