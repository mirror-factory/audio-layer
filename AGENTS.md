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
- `lib/assemblyai/types.ts` — Transcribe API response types (shared by route + page)
- `app/api/transcribe/route.ts` — POST: multipart form → upload → submit → insert Meetings row → return id
- `app/api/transcribe/[id]/route.ts` — GET: fast-path from store; else poll AssemblyAI; on completion summarize + persist
- `app/record/page.tsx` — UI: mic recorder + file upload, polls, redirects to `/meetings/[id]`
- `components/audio-recorder.tsx` — MediaRecorder browser mic wrapper
- `components/transcript-view.tsx` — Speaker-segmented transcript + summary sidebar

### Auth (anonymous Supabase sessions)
- `middleware.ts` — runs on every non-static request; calls `signInAnonymously()` on first visit so the user has a stable id before any meetings-table interaction. No-ops when Supabase env is missing.
- `lib/supabase/user.ts` — `getSupabaseUser()` and `getCurrentUserId()` helpers. Per-request, cookie-bound, anon-role client (RLS does the filtering).
- `lib/supabase/server.ts` — service-role client (bypasses RLS). Use sparingly — only for cross-user admin tasks. Currently unused.
- Real sign-in (email magic link / OAuth) is NOT wired. Anonymous Supabase accounts can be upgraded in place via `linkIdentity()` when we add it; existing meetings stay attached.

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
- `app/api/meetings/[id]/export/route.ts` — GET `?format=md` → markdown attachment
- `lib/meetings/export.ts` — `meetingToMarkdown()` + `meetingFilenameStem()` (pure, fully unit-tested). PDF intentionally deferred — browser Print → Save as PDF works on the detail page.

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
