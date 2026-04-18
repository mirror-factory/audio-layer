# audio-layer — Agent Context

## Product

Audio intake + meeting transcription app. Multi-platform: web (Next.js), iOS + Android (Capacitor), macOS + Windows (Tauri). No bot in the meeting — audio captured at OS level. Pricing tiers: Core $15/mo, Pro $25/mo, 25 free meetings.

## Tech Stack (LOCKED — do not re-debate)
- Frontend: Next.js 15 (App Router), React 19, TypeScript
- Styling: Tailwind CSS v4
- AI LLM calls: Vercel AI SDK v6 via AI Gateway (default `anthropic/claude-sonnet-4-6`)
- **Transcription: AssemblyAI Universal-3 Pro — DIRECT, not via Gateway.**
  - Streaming: `u3-rt-pro` at `wss://api.assemblyai.com/v3/realtime/ws`
  - Batch: `speech_model: 'best'` at `api.assemblyai.com/v2/transcript`
  - Env: `ASSEMBLYAI_API_KEY`
  - The Vercel AI Gateway does NOT route audio/STT providers as of April 2026 — confirmed by hitting `https://ai-gateway.vercel.sh/v1/models` (types are `language | embedding | image | video | reranking` only).
- Mobile shell: Capacitor wrapping static-exported Next.js + native audio plugins
- Desktop shell: **Tauri** (not Electron) — OS webview + Rust bridge for Core Audio / ScreenCaptureKit / WASAPI
- Observability: Langfuse via OTEL (auto on every AI SDK call)
- Testing: Vitest (unit), Playwright (e2e/visual/mobile)
- Package Manager: pnpm

## AI SDK v6 Patterns (CRITICAL)
- Use `inputSchema` NOT `parameters` in tool definitions
- Use `toUIMessageStreamResponse()` NOT `toDataStreamResponse()`
- Message format: `message.parts[]` NOT `message.content`
- Tool part types: `part.type === 'tool-{toolName}'`
- Tool states: `input-streaming` | `input-available` | `output-available` | `output-error`
- `addToolOutput` NOT `addToolResult`
- `sendMessage` NOT `append`
- `convertToModelMessages()` must be `await`ed (async in v6)
- Multi-step client: `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls`

## Tool System
[COMPRESSED TOOL REGISTRY]|format: name|type|ui|category|description
|searchDocuments|server|custom|search|Search documents by query
|askQuestion|client|interactive|interview|Ask user a multiple-choice question
|updateSettings|server|silent|config|Update a configuration setting

## Registries (Single Source of Truth)
- Tool metadata: `lib/ai/tool-meta.ts` (TOOL_META)
- Tool definitions: `lib/ai/tools.ts` (allTools)
- Derived registry: `lib/registry.ts` (SILENT_TOOLS, CUSTOM_UI_TOOLS, TOOL_BY_NAME)
- All new tools MUST be in TOOL_META AND in allTools

## Testing
- `pnpm typecheck && pnpm test` — must pass before commit
- Registry sync test auto-validates TOOL_META <-> allTools match

## Observability
- EVERY `streamText`/`generateText` call MUST spread `telemetryConfig` from `@/lib/ai/telemetry`
- Console logging via `logAICall()` after completion
- Dashboard stub at `/observability`

## Key Files

### Chat reference (from starter kit)
- `app/api/chat/route.ts` — Chat API (streamText + tools + telemetry)
- `app/chat/page.tsx` — Chat UI (useChat, message.parts[], tool rendering)
- `lib/ai/tools.ts` — 3 tool definitions (server + client)
- `lib/ai/tool-meta.ts` — Tool metadata registry
- `lib/ai/telemetry.ts` — Telemetry config + console logger
- `lib/registry.ts` — Derived sets (SILENT_TOOLS, CUSTOM_UI_TOOLS, etc.)
- `components/chat-message.tsx` — Message renderer (text, reasoning, tool parts)
- `components/tool-card.tsx` — Generic tool card UI
- `components/chat-input.tsx` — Textarea + submit

### Transcribe pipeline (V1 batch)
- `lib/assemblyai/client.ts` — AssemblyAI SDK factory (reads `ASSEMBLYAI_API_KEY`)
- `lib/assemblyai/schema.ts` — Zod `MeetingSummarySchema` (title, summary, keyPoints, actionItems, decisions, participants)
- `lib/assemblyai/summary.ts` — `summarizeMeeting()` via `generateObject` through Gateway with `withTelemetry`
- `lib/assemblyai/intake.ts` — Zod `IntakeFormSchema` + `extractIntakeForm()`. Runs in parallel with `summarizeMeeting()` after every completion (batch + streaming). Strict prompt: leave fields blank rather than invent.
- `lib/assemblyai/types.ts` — Transcribe API response types (shared by route + page)
- `app/api/transcribe/route.ts` — POST: multipart form → upload → submit → insert Meetings row → return id
- `app/api/transcribe/[id]/route.ts` — GET: fast-path from store; else poll AssemblyAI; on completion summarize + persist
- `app/record/page.tsx` — UI: mic recorder + file upload, polls, redirects to `/meetings/[id]`
- `components/audio-recorder.tsx` — MediaRecorder browser mic wrapper
- `components/transcript-view.tsx` — Speaker-segmented transcript + summary sidebar

### Mobile shell (Capacitor)
- `capacitor.config.ts` — appId `com.mirrorfactory.audiolayer`, `server.url` points at hosted Vercel app in production / localhost in dev. iOS contentInset = "always"; Android allows cleartext only in dev.
- `mobile/setup.sh` — idempotent Mac bootstrap that runs `npx cap add ios|android`, then applies the manifest/plist patches.
- `mobile/patches/apply-ios-plist.py` — uses stdlib plistlib to add `NSMicrophoneUsageDescription`, `UIBackgroundModes[audio]`, and a localhost ATS exception for Simulator dev.
- `mobile/patches/apply-android-manifest.py` — adds `RECORD_AUDIO` + `MODIFY_AUDIO_SETTINGS`, sets `usesCleartextTraffic=true` + `hardwareAccelerated=true` on `<application>`.
- `mobile/patches/apply-mainactivity.sh` — injects an `onPermissionRequest` override on MainActivity's WebChromeClient so `navigator.mediaDevices.getUserMedia()` inside the Android WebView actually grants mic access (Capacitor's bridge doesn't do this for plain WebView paths).
- All three patchers are idempotent — safe to re-run after `npx cap sync`.
- `mobile/README.md` — workstation setup, dev workflow, troubleshooting.
- Native `ios/` and `android/` projects stay gitignored — regenerated per-workstation via `mobile/setup.sh`.
- **Verification gap:** iOS and Android native projects were NOT generated in the build environment for this commit (no Xcode / Android SDK). The Python patchers were smoke-tested with fake plist/manifest files. See `VERIFICATION_GAPS.md` entry #3.

### Desktop shell (Tauri 2.x)
- `src-tauri/` — Cargo + tauri.conf.json + capabilities + Info.plist + Rust entrypoint. Bundle identifier `com.mirrorfactory.audiolayer`.
- Dev URL = `http://localhost:3000`; production frontendDist points at the hosted Vercel app.
- Rust commands: `ping`, `start_mic_capture(channel)`, `stop_mic_capture()`, `start_system_audio_capture(channel)`, `stop_system_audio_capture()`.
  - **Mic capture** (all platforms): `cpal` → default input → mono mix → 16 kHz int16 LE → ~150 ms chunks via `tauri::ipc::Channel<Vec<u8>>`.
  - **System audio — macOS**: `screencapturekit` crate (macos_14_0 feature). `SCShareableContent::current()` triggers the OS Screen Recording prompt on first call. `SCStream` with `captures_audio=true` at 48 kHz stereo; we mix+decimate to match the mic path's chunk shape. Module lives in `src-tauri/src/lib.rs::macos_audio`.
  - **System audio — Windows/Linux**: still stubbed with an explicit "not wired yet" error; WASAPI loopback + PipeWire monitor come in follow-up commits.
- `src-tauri/Info.plist` — `NSMicrophoneUsageDescription` + `LSMinimumSystemVersion=14.0`. Screen Recording permission is granted through System Settings on first SCShareableContent call; no plist key for that one.
- `lib/tauri/bridge.ts` — `isTauri()` + `loadTauriBridge()` lazy-loader. Imports `@tauri-apps/api/core` through a string variable so the regular web bundle never resolves it.
- `components/live-recorder.tsx` prefers the Tauri capture channel inside the desktop shell, falls back to AudioWorklet in normal browsers — no UI change required.
- No `cargo`/`tauri` scripts in package.json (keeps Rust toolchain off the critical path for web devs). Build with `cargo tauri dev` / `cargo tauri build` from the repo root.
- **Verification gap:** Rust code was not compiled in the build environment that produced this commit — no Rust toolchain available. `screencapturekit` 1.x API shape was inferred from docs; `extract_float_samples` is marked TODO. See `VERIFICATION_GAPS.md` entry #12.

### Cost + usage tracking
- `lib/billing/llm-pricing.ts` — `COST_PER_M_TOKENS` map (Claude, GPT, Gemini) + `pricingForModel()` + `estimateLlmCost()` (handles cached-input discount) + `formatUsd()` (sensible-precision money display).
- `lib/billing/assemblyai-pricing.ts` — per-hour base rates × (batch | streaming), add-on stacks (diarization, summarization, entities, etc.), multi-channel billing. Convenience wrappers for our standard batch/streaming configs.
- `lib/billing/types.ts` — `MeetingCostBreakdown` (STT + LLM per-call + total) and `UsageSummary` (what the /usage page renders).
- `lib/billing/usage.ts` — `getUsageSummary()`: aggregates `meetings.cost_breakdown` rows locally, then overlays Langfuse Daily Metrics when the keys are configured AND Langfuse reports traces for this user. Falls back to local numbers automatically.
- `lib/observability/langfuse-api.ts` — thin wrapper around `GET /api/public/metrics/daily` with Basic auth + userId filter. Null-safe factory, explicit error throws so callers can log + fall back.
- Schema: `meetings.cost_breakdown jsonb` persists per-meeting STT + LLM cost. Round-tripped through both store impls.
- `app/usage/page.tsx` — server-rendered tiles: meetings, minutes, STT spend, LLM spend, all lifetime + this-month. Subscription section from the `profiles` row.
- `components/meeting-cost-panel.tsx` — per-meeting panel rendered on `/meetings/[id]`. Shows 3 headline tiles + per-LLM-call breakdown table. Hidden when `cost_breakdown` is null.
- Pricing sources: April 2026 AssemblyAI published rates for STT; `COST_PER_M_TOKENS` for LLMs. Review quarterly — no live price feed wired.

### Langfuse serverless flush (critical)
- **Langfuse shows zeros without this.** On Vercel, OTel span processors buffer spans in memory; when the function freezes, buffered spans never upload. Result: `countTraces > 0` but `totalCost === 0`.
- Fix: `lib/langfuse-setup.ts` exports `flushLangfuse()`. Every AI-calling route ends with `after(flushLangfuse)` — Next.js 15's `after()` runs after the response is sent, giving the processor time to upload.
- Routes wired: `/api/chat`, `/api/transcribe/[id]`, `/api/transcribe/stream/finalize`.
- When Langfuse isn't configured the flush is a no-op.

### Quota / paywall
- `lib/billing/quota.ts` — `checkQuota()` + `FREE_TIER_MEETING_LIMIT = 25`. Counts the current user's meetings via the user-scoped Supabase client (RLS does the scoping). Active / trialing subscriptions bypass.
- Enforced server-side in `app/api/transcribe/route.ts` (batch) and `app/api/transcribe/stream/token/route.ts` (live). Returns HTTP 402 + `{ code: "free_limit_reached", upgradeUrl: "/pricing" }`.
- Both client recorders (`app/record/page.tsx`, `components/live-recorder.tsx`) detect 402 and surface the upgrade message inline.
- Fail-open: a transient DB read failure does NOT lock the user out; we just don't tick the meter.
- Dev mode without Supabase: quota always allows.

### Billing (Stripe)
- `lib/stripe/client.ts` — `getStripe()` (null when STRIPE_SECRET_KEY missing) + `priceIdForTier()` / `tierForPriceId()` (env-driven)
- `lib/stripe/profiles.ts` — service-role helpers: `getOrCreateProfile()`, `setStripeCustomerId()`, `setSubscriptionState()`. Why service-role: webhook is anonymous from the user's perspective so the cookie-bound anon client can't satisfy RLS on writes.
- `lib/supabase/schema.sql` — `profiles` table mirrors auth.users + Stripe customer/subscription columns; SELECT-only RLS for the user (writes are server-only)
- `app/api/stripe/checkout/route.ts` — POST `{ tier }` → creates/reuses Stripe customer, opens Checkout Session, returns URL
- `app/api/stripe/webhook/route.ts` — POST raw-body signature check; handles `checkout.session.completed` + `customer.subscription.{created,updated,deleted}`; idempotent state sync
- `app/pricing/page.tsx` — static three-tier landing (Free / Core $15 / Pro $25)
- `app/pricing/pricing-buttons.tsx` — client subscribe button; surfaces 503 messaging when Stripe env is missing
- **No paywall is wired yet** — the meeting routes stay open. Gating is intentionally deferred until we have real customers; the data is in place when we add it.

### Auth (anonymous + email magic link)
- `middleware.ts` — runs on every non-static request; calls `signInAnonymously()` on first visit so the user has a stable id before any meetings-table interaction. No-ops when Supabase env is missing.
- `lib/supabase/user.ts` — `getSupabaseUser()` and `getCurrentUserId()` helpers. Per-request, cookie-bound, anon-role client (RLS does the filtering).
- `lib/supabase/browser.ts` — client-component Supabase factory (uses `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- `lib/supabase/server.ts` — service-role client (bypasses RLS). Used by the Stripe profile helpers; never import from client components.
- `app/sign-in/page.tsx` — magic-link form (`signInWithOtp` + `emailRedirectTo` → `/auth/callback`).
- `app/auth/callback/route.ts` — exchanges the OTP code for a session, sets cookies, redirects.
- `app/auth/sign-out/route.ts` — POST-only sign-out, redirects to `/`.
- `app/profile/page.tsx` — server-rendered current identity + subscription state from `profiles`.
- **Known V1 gap:** an anonymous user who signs in with email gets a NEW user_id; their previous anonymous-session meetings become unreachable via RLS. Migration path is `linkIdentity()` (or a server-side re-parent on the service-role client) — flagged in the profile UI.

### Meetings persistence + list/detail
- `lib/supabase/schema.sql` — `meetings` table DDL with RLS policies (run manually once via SQL editor or psql)
- `lib/meetings/types.ts` — `Meeting`, `MeetingListItem`, `MeetingInsert`, `MeetingUpdate`
- `lib/meetings/store.ts` — `MeetingsStore` interface + **async** `getMeetingsStore()`: returns user-scoped Supabase store when configured, in-memory singleton otherwise. Always `await` it.
- `lib/meetings/store-in-memory.ts` — dev fallback (FIFO, 500 entries)
- `lib/meetings/store-supabase.ts` — prod impl against `meetings` table
- `app/api/meetings/route.ts` — GET list (limit 50, max 200)
- `app/api/meetings/[id]/route.ts` — GET single
- `app/meetings/page.tsx` — server-rendered recent-meetings list
- `app/meetings/[id]/page.tsx` — detail view; `components/meeting-detail-poller.tsx` keeps non-terminal rows live
- `app/api/meetings/[id]/export/route.ts` — GET `?format=md|pdf`. PDF lazy-loads `lib/meetings/pdf.tsx` to keep `@react-pdf/renderer` out of the markdown cold-start.
- `lib/meetings/export.ts` — `meetingToMarkdown()` + `meetingFilenameStem()` (pure, fully unit-tested).
- `lib/meetings/pdf.tsx` — server-only `meetingToPdfBuffer()` via `@react-pdf/renderer`. Same section ordering / emptiness rules as the markdown render so both formats stay in lockstep.

### Streaming pipeline (V2 live)
- `app/api/transcribe/stream/token/route.ts` — POST mints AssemblyAI ephemeral token (10 min TTL, 1 hr max session), allocates UUID meetingId, inserts Meetings row with status=processing
- `app/api/transcribe/stream/finalize/route.ts` — POST validates body with Zod (utterances schema), summarizes via Gateway, upserts Meetings row to completed
- `app/record/live/page.tsx` — /record/live UI
- `components/live-recorder.tsx` — AudioContext + AudioWorklet + StreamingTranscriber; tears down on unmount
- `components/live-transcript-view.tsx` — finalized turns + current partial
- `public/worklets/pcm-downsampler.js` — AudioWorklet: 48k/44.1k → 16k int16 LE, ~150 ms chunks; no imports (worklet scope)

## Common Gotchas
- Client-side tools (askQuestion) have NO execute function — they pause the stream
- Tool parts have `part.type === 'tool-{toolName}'`, strip the 'tool-' prefix to get the name
- Silent tools should render nothing in the chat UI
- Use `sendMessage({ text })` not `append`
- Transcribe + meetings routes use `runtime = 'nodejs'` (Supabase / AssemblyAI SDK need Node APIs; edge won't work)
- `/api/transcribe` accepts files up to 100MB (sanity cap). Larger files need storage-backed flow (future PR).
- MeetingsStore falls back to in-memory when SUPABASE_URL is unset — state is lost on redeploy. Production MUST configure Supabase and run `lib/supabase/schema.sql`.
- `getMeetingsStore()` is **async** — always `await` before calling `.list/.get/.insert/.update`. The double-await on callers is intentional: `(await getMeetingsStore()).list(...)`.
- `getSupabaseServer()` uses the service-role key and bypasses RLS. Never import it from client components. Prefer `getSupabaseUser()` (anon-role + cookies) for normal app code.
- Anonymous Supabase Sign-Ins must be enabled in the Supabase dashboard (Authentication → Providers) for middleware.ts to succeed.
- Streaming: import `StreamingTranscriber` from `'assemblyai'` (main entry), NOT `'assemblyai/streaming'` — the subpath only re-exports the old v2 RealtimeTranscriber.
- Streaming sample rate is locked at 16 kHz; higher mic rates MUST go through the AudioWorklet + BiquadFilter anti-alias chain.
- Ephemeral tokens are minted server-side ONLY. Never send `ASSEMBLYAI_API_KEY` to the browser.

## Audio Capture Rules (per platform)
- Web (browser): mic only via `getUserMedia` — no system audio available
- Capacitor (iOS): mic only. iOS sandbox blocks other-app audio; speaker-mode workaround for virtual calls.
- Capacitor (Android): mic via `AudioRecord`; system audio via `MediaProjection` (Android 10+) — behavior varies by device, treat as best-effort.
- Tauri (macOS): mic via AVFoundation + system audio via ScreenCaptureKit (macOS 13+). Requires Microphone + Screen Recording permissions.
- Tauri (Windows): mic + WASAPI loopback for system audio. Mic permission only.
- Always send ≥16 kHz PCM to AssemblyAI. Sub-16 kHz degrades accuracy even on U-3 Pro.
- Multi-channel billing: sending mic + system as separate channels doubles cost but improves diarization — use `multichannel: true` only when the UX benefit justifies it.

## Do Not Do
- Do not route AssemblyAI through the Vercel AI Gateway. It's not supported.
- Do not suggest Deepgram, Whisper, or other STT providers as the default. AssemblyAI U-3 Pro is the locked engine. Alternative providers only come up for cost/fallback discussions if the user explicitly raises them.
- Do not propose Electron. Desktop is Tauri.
- Do not remove or rename `audio-layer` to a product name; the repo stays `audio-layer`.

<!-- KIT-CATALOG:START -->

## Kit Catalog

**Every file the kit ships, grouped by purpose.** Before writing a new file, check if it's already here. If it is, copy the template instead of writing from scratch. Reinventing kit-shipped code is a documented failure mode.

_Auto-generated by `ai-dev-kit onboard`. Last refreshed 2026-04-18._

### Agent context

| Project path | Purpose |
|--------------|---------|
| `CLAUDE.md` | Claude Code entry point (points to AGENTS.md) |
| `docs/guides/AI-STARTER-HUB.md` | starter-hub overview doc |
| `llms.txt` | machine-readable project summary for LLMs |

### API routes

| Project path | Purpose |
|--------------|---------|
| `app/api/dev-kit/connectors/route.ts` | /api/dev-kit/connectors |
| `app/api/dev-kit/cost/route.ts` | /api/dev-kit/cost |
| `app/api/dev-kit/coverage/route.ts` | /api/dev-kit/coverage |
| `app/api/dev-kit/deployments/route.ts` | /api/dev-kit/deployments |
| `app/api/dev-kit/evals/[id]/route.ts` | /api/dev-kit/evals/[id] |
| `app/api/dev-kit/evals/route.ts` | /api/dev-kit/evals |
| `app/api/dev-kit/logs/unified/route.ts` | /api/dev-kit/logs/unified |
| `app/api/dev-kit/overview/route.ts` | /api/dev-kit/overview |
| `app/api/dev-kit/regressions/route.ts` | /api/dev-kit/regressions |
| `app/api/dev-kit/sessions/[id]/route.ts` | /api/dev-kit/sessions/[id] |
| `app/api/dev-kit/sessions/route.ts` | /api/dev-kit/sessions |
| `app/api/dev-kit/tools/route.ts` | /api/dev-kit/tools |
| `app/api/health/route.ts` | /api/health |
| `app/api/observability/health/route.ts` | /api/observability/health |

### CI

| Project path | Purpose |
|--------------|---------|
| `.github/workflows/ai-dev-kit.yml` | GitHub Actions: ai-dev-kit.yml |
| `.github/workflows/nightly.yml` | GitHub Actions: nightly.yml |

### Claude Code hooks

| Project path | Purpose |
|--------------|---------|
| `.claude/hooks/context7-suggest` | context7-suggest lifecycle hook |
| `.claude/hooks/observability-context` | observability-context lifecycle hook |
| `.claude/hooks/periodic-reground` | periodic-reground lifecycle hook |
| `.claude/hooks/postuse-format` | postuse-format lifecycle hook |
| `.claude/hooks/record-docs-lookup` | record-docs-lookup lifecycle hook |
| `.claude/hooks/session-startup` | session-startup lifecycle hook |
| `.claude/hooks/track-edits` | track-edits lifecycle hook |
| `.claude/hooks/verify-before-stop` | verify-before-stop lifecycle hook |
| `.claude/hooks/verify-claims` | verify-claims lifecycle hook |
| `.claude/settings.json` | hook wiring (merged, not replaced) |

### Core runtime

| Project path | Purpose |
|--------------|---------|
| `lib/_metadata` | runtime module: _metadata |
| `lib/_registry` | runtime module: _registry |
| `lib/_types` | runtime module: _types |
| `lib/ai-dev-kit.lock` | runtime module: ai-dev-kit.lock |
| `lib/dashboard-data` | runtime module: dashboard-data |
| `lib/devtools-setup` | runtime module: devtools-setup |
| `lib/local-models` | runtime module: local-models |
| `lib/notification-events` | runtime module: notification-events |
| `lib/project.config` | runtime module: project.config |
| `lib/promptfooconfig` | runtime module: promptfooconfig |
| `lib/recordings-allowlist` | runtime module: recordings-allowlist |
| `lib/research-cache` | runtime module: research-cache |
| `lib/tool-rubrics` | runtime module: tool-rubrics |
| `lib/workflow-example` | runtime module: workflow-example |

### Dashboard pages

| Project path | Purpose |
|--------------|---------|
| `app/dev-kit/connectors/page.tsx` | /dev-kit/connectors page |
| `app/dev-kit/cost/page.tsx` | /dev-kit/cost page |
| `app/dev-kit/coverage/page.tsx` | /dev-kit/coverage page |
| `app/dev-kit/deployments/page.tsx` | /dev-kit/deployments page |
| `app/dev-kit/evals/[id]/page.tsx` | /dev-kit/evals/[id] page |
| `app/dev-kit/evals/page.tsx` | /dev-kit/evals page |
| `app/dev-kit/layout.tsx` | /dev-kit/layout.tsx page |
| `app/dev-kit/page.tsx` | /dev-kit/ page |
| `app/dev-kit/regressions/page.tsx` | /dev-kit/regressions page |
| `app/dev-kit/sessions/[id]/page.tsx` | /dev-kit/sessions/[id] page |
| `app/dev-kit/sessions/page.tsx` | /dev-kit/sessions page |
| `app/dev-kit/tools/page.tsx` | /dev-kit/tools page |
| `app/dev-kit/use-realtime.tsx` | /dev-kit/use-realtime.tsx page |
| `app/drift-page` | legacy page template: drift-page |
| `app/performance-page` | legacy page template: performance-page |
| `app/rubrics-page` | legacy page template: rubrics-page |
| `app/tests-dashboard-page` | legacy page template: tests-dashboard-page |
| `app/video-registry-page` | legacy page template: video-registry-page |

### Error boundaries

| Project path | Purpose |
|--------------|---------|
| `app/error.tsx` | route-level Next.js error boundary |
| `app/global-error.tsx` | global Next.js error boundary |

### Git hooks

| Project path | Purpose |
|--------------|---------|
| `.husky/post-commit` | husky post-commit |
| `.husky/pre-commit` | husky pre-commit |
| `.husky/pre-push` | husky pre-push |

### Harness artifacts

| Project path | Purpose |
|--------------|---------|
| `.ai-dev-kit/review.md.template` | review.md template |
| `.ai-dev-kit/spec.md.template` | spec.md template |
| `.ai-dev-kit/sprint.md.template` | sprint.md template |

### Notifications

| Project path | Purpose |
|--------------|---------|
| `.ai-dev-kit/notify.yaml` | ntfy config (topic + 4 channels) |

### Observability + utilities (lib/)

| Project path | Purpose |
|--------------|---------|
| `instrumentation.ts` | Next.js instrumentation with graceful degradation |
| `lib/langfuse-setup.ts` | Langfuse OTel setup (guarded) |
| `lib/log-aggregator.ts` | unified log view across stdout / file / Supabase / Langfuse / dev3000 |
| `lib/logger.ts` | structured stdout logger (always on, never throws) |
| `lib/model-router.ts` | Claude-Code-subscription-aware gateway |
| `lib/notify.ts` | ntfy notifier (fire-and-forget; 3s timeout) |
| `lib/registry.ts` | typed vendor-registry loader + validModels() + assertValidModel() |
| `lib/sink-stats.ts` | in-memory event counts per sink (silent-sink detection) |
| `lib/ts` | AI tooling: ts |
| `lib/ts` | AI tooling: ts |
| `lib/tsx` | AI tooling: tsx |
| `lib/tsx` | AI tooling: tsx |
| `lib/tsx` | AI tooling: tsx |
| `lib/with-external.ts` | wraps non-AI-SDK vendor calls with logging + Langfuse spans |
| `lib/with-route.ts` | API route wrapper; returns JSON on error with x-request-id |
| `middleware.ts` | x-request-id injection |

### Project config

| Project path | Purpose |
|--------------|---------|
| `env.local.template` | config file: env.local.template |
| `eslint.config.mjs` | config file: eslint.config.mjs |
| `playwright.config.ts` | config file: playwright.config.ts |
| `vitest.config.ts` | config file: vitest.config.ts |
| `vitest.eval.config.ts` | config file: vitest.eval.config.ts |

### Project docs

| Project path | Purpose |
|--------------|---------|
| `CHANGELOG.md` | project changelog seed (Keep a Changelog format) |

### Sample code

| Project path | Purpose |
|--------------|---------|
| `lib/ai/tools/sample-tool` | sample: sample-tool |
| `lib/ai/tools/sample-tool` | sample: sample-tool |

### Scripts (scripts/)

| Project path | Purpose |
|--------------|---------|
| `scripts/check-deprecations.ts` | check-deprecations.ts (run via pnpm or pre-commit) |
| `scripts/check-registry-strings.ts` | check-registry-strings.ts (run via pnpm or pre-commit) |
| `scripts/generate-secrets-md.ts` | generate-secrets-md.ts (run via pnpm or pre-commit) |
| `scripts/setup-dev-tools.sh` | setup-dev-tools.sh (run via pnpm or pre-commit) |

### Subagents

| Project path | Purpose |
|--------------|---------|
| `.claude/agents/evaluator` | evaluator subagent |
| `.claude/agents/planner` | planner subagent |
| `.claude/agents/spec-enricher` | spec-enricher subagent |

### Supabase

| Project path | Purpose |
|--------------|---------|
| `supabase/migrations/00001_ai_dev_kit_schema.sql` | Supabase asset: migrations/00001_ai_dev_kit_schema.sql |

### Test templates

| Project path | Purpose |
|--------------|---------|
| `tests/api/route-smoke.test.ts` | api/route-smoke.test.ts |
| `tests/integration/live-vendor.test.ts.example` | integration/live-vendor.test.ts.example |

### Vendor registries

| Project path | Purpose |
|--------------|---------|
| `.ai-dev-kit/registries/README.md` | how-to-add-a-vendor docs |
| `.ai-dev-kit/registries/registry.schema.json` | registry JSON Schema |

<!-- KIT-CATALOG:END -->
