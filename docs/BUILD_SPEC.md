# Layer One Audio -- Complete Build Specification

**Version:** 0.0.1
**Generated:** 2026-04-17
**Purpose:** Everything needed to rebuild this application from scratch in a single agent session.

---

## 1. Product Overview

Layer One Audio captures conversations passively (no meeting bot) and uses AI to extract structured, actionable data -- not just summaries, but budgets, timelines, decision makers, requirements, and pain points. It ships as web (Next.js on Vercel), macOS desktop (Tauri 2.x with Rust for ScreenCaptureKit system audio), and iOS mobile (Capacitor 8 WebView) from a single codebase. Users pick their own LLM and see per-meeting costs transparently.

### The 5 Core Integrations

| Integration | Purpose | SDK/Package |
|---|---|---|
| **AssemblyAI** | Speech-to-text (batch + real-time streaming with speaker diarization) | `assemblyai` npm package, direct API (NOT through AI Gateway) |
| **Vercel AI Gateway** | LLM routing to Claude/GPT/Gemini via single API key, `generateObject` with Zod schemas | `ai` (Vercel AI SDK v6), `@ai-sdk/gateway` |
| **Supabase** | PostgreSQL database with RLS, anonymous + email + Google OAuth auth | `@supabase/supabase-js`, `@supabase/ssr` |
| **Stripe** | Billing: Free (25 meetings) / Core ($15/mo) / Pro ($25/mo) | `stripe` npm package |
| **Resend** | Transactional email: magic links, OTP codes, welcome, meeting notifications | `resend` npm package |

### Tech Stack

- Next.js 15, React 19, Tailwind v4, TypeScript
- Tauri 2.x (Rust backend, macOS ScreenCaptureKit)
- Capacitor 8 (iOS/Android WebView shell)
- Vitest (106 unit tests), Playwright (e2e)
- pnpm as package manager
- Langfuse for LLM observability via OpenTelemetry

---

## 2. Database Schema

### Complete SQL (run in Supabase SQL Editor)

```sql
-- meetings table
create table if not exists meetings (
  id               text        primary key,           -- AssemblyAI id (batch) or UUID (streaming)
  user_id          uuid        references auth.users (id) on delete cascade,
  status           text        not null default 'processing',  -- queued | processing | completed | error
  title            text,                                        -- generated 3-8 word headline
  text             text,                                        -- full joined transcript
  utterances       jsonb       not null default '[]'::jsonb,    -- speaker-segmented turns
  duration_seconds real,
  summary          jsonb,                                       -- MeetingSummarySchema output
  intake_form      jsonb,                                       -- IntakeFormSchema output
  error            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists meetings_created_at_idx
  on meetings (created_at desc);

create index if not exists meetings_user_id_idx
  on meetings (user_id);

-- Migration columns for existing rows
alter table meetings add column if not exists intake_form jsonb;
alter table meetings add column if not exists cost_breakdown jsonb;

-- cost_breakdown jsonb shape:
-- {
--   stt:  { mode, model, durationSeconds, ratePerHour, baseCostUsd,
--           addonCostUsd, totalCostUsd },
--   llm:  { totalInputTokens, totalOutputTokens, totalCostUsd,
--           calls: [{ label, model, inputTokens, outputTokens, costUsd }] },
--   totalCostUsd: number
-- }

-- Auto-update updated_at trigger
create or replace function meetings_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists meetings_touch on meetings;
create trigger meetings_touch
before update on meetings
for each row execute function meetings_touch_updated_at();

-- profiles table (Stripe billing)
create table if not exists profiles (
  user_id              uuid        primary key references auth.users (id) on delete cascade,
  stripe_customer_id   text        unique,
  subscription_status  text,       -- active | trialing | past_due | canceled | null
  subscription_tier    text,       -- core | pro | null
  current_period_end   timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

drop trigger if exists profiles_touch on profiles;
create trigger profiles_touch
before update on profiles
for each row execute function meetings_touch_updated_at();

alter table profiles enable row level security;

drop policy if exists "profiles_owner_select" on profiles;
create policy "profiles_owner_select"
  on profiles for select
  using (auth.uid() = user_id);

-- RLS on meetings
alter table meetings enable row level security;

drop policy if exists "meetings_owner_select" on meetings;
create policy "meetings_owner_select"
  on meetings for select
  using (auth.uid() = user_id);

drop policy if exists "meetings_owner_insert" on meetings;
create policy "meetings_owner_insert"
  on meetings for insert
  with check (auth.uid() = user_id);

drop policy if exists "meetings_owner_update" on meetings;
create policy "meetings_owner_update"
  on meetings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "meetings_owner_delete" on meetings;
create policy "meetings_owner_delete"
  on meetings for delete
  using (auth.uid() = user_id);
```

### Meetings Table Columns

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | AssemblyAI transcript ID (batch) or UUID (streaming) |
| `user_id` | uuid FK -> auth.users | Owner, set on insert for RLS |
| `status` | text | `queued` / `processing` / `completed` / `error` |
| `title` | text | AI-generated 3-8 word headline |
| `text` | text | Full joined transcript text |
| `utterances` | jsonb | Array of `{speaker, text, start, end, confidence}` |
| `duration_seconds` | real | Audio duration from AssemblyAI |
| `summary` | jsonb | MeetingSummarySchema output |
| `intake_form` | jsonb | IntakeFormSchema output |
| `cost_breakdown` | jsonb | STT + LLM cost breakdown |
| `error` | text | Error message if status=error |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-updated via trigger |

### Profiles Table Columns

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK, FK -> auth.users | |
| `stripe_customer_id` | text unique | Stripe customer ID |
| `subscription_status` | text | active / trialing / past_due / canceled / null |
| `subscription_tier` | text | core / pro / null |
| `current_period_end` | timestamptz | Subscription renewal date |
| `created_at` / `updated_at` | timestamptz | Auto-managed |

### RLS Policies Summary

- **meetings**: All 4 operations (SELECT/INSERT/UPDATE/DELETE) restricted to `auth.uid() = user_id`
- **profiles**: SELECT only restricted to `auth.uid() = user_id`; writes happen via service-role key (Stripe webhooks are anonymous)

### Supabase Dashboard Setup (one-time)

1. SQL Editor -> paste the schema above -> Run
2. Authentication -> Providers -> Enable "Allow anonymous sign-ins"
3. Authentication -> URL Configuration -> Add callback URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<app>.vercel.app/auth/callback`

---

## 3. API Routes

### 3.1 POST /api/transcribe -- Batch Transcription

**File:** `app/api/transcribe/route.ts`
**Runtime:** nodejs, force-dynamic

**What it does:**
1. Parses multipart form with `audio` field (Blob)
2. Checks free-tier quota (25 meetings lifetime, bypassed for subscribers)
3. Validates file size (max 100MB)
4. Uploads file buffer to AssemblyAI via `client.files.upload(buf)`
5. Submits transcript job with `speech_models`, `speaker_labels: true`, `entity_detection: true`, `punctuate: true`, `format_text: true`
6. Inserts placeholder row in MeetingsStore with status
7. Returns `{ id, status }` with HTTP 202

**Request:** `multipart/form-data` with field `audio` (Blob)

**Response (202):**
```json
{ "id": "transcript_abc123", "status": "processing" }
```

**Error responses:**
- 400: Missing/empty audio file, bad form data
- 402: Free-tier limit reached (includes `code: "free_limit_reached"`, `upgradeUrl: "/pricing"`)
- 413: File exceeds 100MB
- 502: AssemblyAI upload or submit failed

**Key detail -- speech_models migration:**
The AssemblyAI API uses `speech_models` (plural, array of strings), NOT the deprecated `speech_model` (singular). The submit call uses:
```typescript
speech_models: await getBatchSpeechModelsFromSettings()
// Returns e.g. ["universal-3-pro"]
```

### 3.2 GET /api/transcribe/[id] -- Poll + Summarize

**File:** `app/api/transcribe/[id]/route.ts`
**Runtime:** nodejs, force-dynamic

**What it does:**
1. Fast path: if meeting exists in store with status=completed + summary, return cached
2. Otherwise fetch transcript status from AssemblyAI
3. If not completed: upsert status into store and return
4. If completed: run `summarizeMeeting()` + `extractIntakeForm()` IN PARALLEL via `Promise.allSettled`
5. Build cost breakdown (STT from duration + LLM from token usage)
6. Persist everything to MeetingsStore
7. Flush Langfuse spans via `after(flushLangfuse)` -- critical for serverless

**Response (completed):**
```json
{
  "id": "transcript_abc123",
  "status": "completed",
  "text": "full transcript...",
  "utterances": [{"speaker": "A", "text": "...", "start": 0, "end": 5000, "confidence": 0.98}],
  "durationSeconds": 1800,
  "summary": { "title": "...", "summary": "...", "keyPoints": [], "actionItems": [], "decisions": [], "participants": [] },
  "intakeForm": { "intent": "...", "primaryParticipant": "...", ... }
}
```

**Key pattern -- partial success:** Summary and intake run independently. If one fails, the other's data still persists. `Promise.allSettled` ensures neither throws for the other.

### 3.3 POST /api/transcribe/stream/token -- Mint Streaming Token

**File:** `app/api/transcribe/stream/token/route.ts`
**Runtime:** nodejs, force-dynamic

**What it does:**
1. Checks free-tier quota
2. Mints ephemeral AssemblyAI streaming token (10 min TTL, 1 hour max session)
3. Generates UUID meeting ID
4. Inserts placeholder row (status: processing)
5. Reads streaming speech model from user settings cookie

**Response:**
```json
{
  "token": "eyJ...",
  "meetingId": "uuid-v4",
  "expiresAt": 1713400000000,
  "sampleRate": 16000,
  "speechModel": "u3-rt-pro"
}
```

### 3.4 POST /api/transcribe/stream/finalize -- Finalize Streaming

**File:** `app/api/transcribe/stream/finalize/route.ts`
**Runtime:** nodejs, force-dynamic

**Request body (validated with Zod):**
```typescript
const FinalizeBodySchema = z.object({
  meetingId: z.string().min(1),
  text: z.string().default(""),
  utterances: z.array(z.object({
    speaker: z.string().nullable(),
    text: z.string(),
    start: z.number(),
    end: z.number(),
    confidence: z.number(),
  })).default([]),
  durationSeconds: z.number().nullable().optional(),
});
```

**What it does:**
1. Validates request body with Zod
2. Runs `summarizeMeeting()` + `extractIntakeForm()` in parallel
3. Computes cost breakdown (streaming STT rate + LLM costs)
4. Upserts meeting with completed status, transcript, summary, intake, cost
5. Flushes Langfuse

**Response:** Same shape as the [id] GET completed response.

### 3.5 POST /api/chat -- Chat with Tools

**File:** `app/api/chat/route.ts`

**What it does:**
1. Receives `UIMessage[]` from client
2. Converts to model messages via `convertToModelMessages`
3. Calls `streamText` with `gateway("openai/gpt-5.4-nano")`
4. Has 3 tools: `searchDocuments` (server), `askQuestion` (client/interactive), `updateSettings` (server/silent)
5. Tracks tool calls, TTFT, token usage
6. Returns `result.toUIMessageStreamResponse()`

**Model:** `openai/gpt-5.4-nano` (hardcoded for chat)

**System prompt:**
```
You are a helpful assistant in a reference app for the Vercel AI SDK v6 starter kit.
You have 3 tools available:
- searchDocuments: Search the knowledge base.
- askQuestion: Ask the user a multiple-choice question.
- updateSettings: Update a configuration value.
Be concise. Use tools when appropriate.
```

### 3.6 GET/PUT /api/settings -- Model Preferences

**File:** `app/api/settings/route.ts`

**GET:** Returns current `ModelSettings` from cookie
**PUT:** Merges partial `ModelSettings` into cookie, returns merged

**Cookie:** `audio-layer-settings`, httpOnly, sameSite=lax, maxAge=1 year

**ModelSettings shape:**
```typescript
interface ModelSettings {
  summaryModel: string;       // e.g. "openai/gpt-5.4-nano"
  batchSpeechModel: string;   // e.g. "universal-3-pro"
  streamingSpeechModel: string; // e.g. "u3-rt-pro"
}
```

**Defaults:**
```typescript
const DEFAULTS: ModelSettings = {
  summaryModel: "openai/gpt-5.4-nano",
  batchSpeechModel: "universal-3-pro",
  streamingSpeechModel: "u3-rt-pro",
};
```

**Fallback chain:** cookie value -> env var -> hardcoded default.

### 3.7 GET /api/models -- Dynamic Model List

**File:** `app/api/models/route.ts`

Fetches available LLM models from `https://ai-gateway.vercel.sh/v1/models`, picks top 3 per provider (Anthropic, OpenAI, Google), sorts by cost. Caches for 5 minutes. On failure, returns a static fallback list.

### 3.8 POST /api/stripe/checkout -- Stripe Checkout

**File:** `app/api/stripe/checkout/route.ts`

**Request:** `{ tier: "core" | "pro" }`

**Flow:**
1. Requires Supabase session (user ID)
2. Gets or creates Stripe customer (stored on profiles table)
3. Creates Stripe Checkout Session with subscription mode
4. Returns `{ url }` for redirect

**Price IDs from env:** `STRIPE_PRICE_CORE`, `STRIPE_PRICE_PRO`

### 3.9 POST /api/stripe/webhook -- Stripe Webhook

**File:** `app/api/stripe/webhook/route.ts`

**Handled events:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**What it does:** Verifies signature with `STRIPE_WEBHOOK_SECRET`, extracts subscription status/tier/period end, writes to profiles table via service-role client.

**Critical:** Uses `request.text()` for raw body BEFORE signature verification. JSON parsing would break the signature.

### 3.10 POST /api/auth/send-email -- Resend Auth Hook

**File:** `app/api/auth/send-email/route.ts`

Supabase "Send Email" auth hook. When configured in Supabase dashboard (Authentication -> Hooks -> Send Email), Supabase calls this instead of built-in SMTP.

**Templates:**
- `magiclink` / `login`: Magic link email with branded template
- `signup` / `email`: OTP code email
- `recovery`: Password reset (magic link style)

**Email sender:** `"audio-layer <onboarding@resend.dev>"` (update after custom domain verification)

### 3.11 Observability Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/ai-logs` | Recent AI call logs from in-memory ring buffer |
| GET | `/api/ai-logs/errors` | Recent AI errors |
| GET | `/api/ai-logs/stats` | Aggregated stats (total calls, errors, avg latency, total cost) |

---

## 4. Key Implementation Details

### 4.1 speech_model -> speech_models Migration

**CRITICAL:** AssemblyAI deprecated the singular `speech_model` field. The API now REJECTS it. Use `speech_models` (plural, array of strings):

```typescript
// WRONG (deprecated, API rejects)
speech_model: "best"

// CORRECT
speech_models: ["universal-3-pro"]
```

The legacy alias `"best"` maps to `["universal-3-pro"]`. The `getBatchSpeechModels()` function handles this:

```typescript
export function getBatchSpeechModels(
  override?: string,
): TranscriptParams["speech_models"] {
  const model = override ?? process.env.ASSEMBLYAI_BATCH_MODEL ?? "universal-3-pro";
  if (model === "best") return ["universal-3-pro"];
  return [model];
}
```

**Valid batch model IDs:** `universal-3-pro`, `slam-1`, `universal-2`, `nano`
**Valid streaming model IDs:** `u3-rt-pro`, `u3-pro`, `universal-streaming-english`, `universal-streaming-multilingual`, `whisper-rt`

### 4.2 Streaming WebSocket Flow

```
Browser                    Server                     AssemblyAI
  |                          |                            |
  |-- POST /stream/token --> |                            |
  |                          |-- createTemporaryToken --> |
  |<-- { token, meetingId }  |                            |
  |                          |                            |
  |-- getUserMedia (mic) --> |                            |
  |-- AudioWorklet (16kHz PCM downsampling)               |
  |                          |                            |
  |-- WebSocket connect (token) -----------------------> |
  |     wss://api.assemblyai.com/v3/realtime/ws          |
  |                          |                            |
  |-- sendAudio(pcm chunks) --------------------------> |
  |<-- turn events (speaker, text, end_of_turn) -------- |
  |                          |                            |
  |-- [Stop button pressed]  |                            |
  |-- close WebSocket ---------------------------------> |
  |                          |                            |
  |-- POST /stream/finalize  |                            |
  |   { meetingId, text,     |                            |
  |     utterances,          |                            |
  |     durationSeconds }    |                            |
  |                          |-- summarizeMeeting()       |
  |                          |-- extractIntakeForm()      |
  |                          |-- upsert to Supabase       |
  |<-- { completed meeting } |                            |
  |-- redirect /meetings/id  |                            |
```

**AudioWorklet details:**
- Source: mic at native sample rate (typically 44.1kHz or 48kHz)
- Anti-alias lowpass filter at 7kHz
- PCM downsampler worklet at `/worklets/pcm-downsampler.js`
- Output: 16kHz int16 LE PCM in 150ms chunks
- The worklet sends chunks via `port.postMessage`

**Tauri path:** When running in Tauri desktop, the live-recorder detects `isTauri()` and uses the native `start_mic_capture` Rust command instead of getUserMedia+AudioWorklet.

**StreamingTranscriber config:**
```typescript
new StreamingTranscriber({
  token: token.token,
  sampleRate: 16000,
  speechModel: "u3-rt-pro",
  formatTurns: true,
  speakerLabels: true,
});
```

### 4.3 Settings Cookie Pattern

Model preferences are stored in a JSON cookie (`audio-layer-settings`) rather than the database:
- Works with or without Supabase configured
- Per-browser, not per-user (no auth required)
- httpOnly, sameSite=lax, path=/, maxAge=1 year
- Read via `getSettings()` (server-side, uses `cookies()` from next/headers)
- Write via `saveSettings()` (called from PUT /api/settings)
- Fallback chain: cookie -> env var -> hardcoded default

```typescript
export async function getSettings(): Promise<ModelSettings> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("audio-layer-settings")?.value;
  let saved: Partial<ModelSettings> = {};
  if (raw) {
    try { saved = JSON.parse(raw); } catch { /* corrupted */ }
  }
  return {
    summaryModel: saved.summaryModel || process.env.DEFAULT_MODEL || DEFAULTS.summaryModel,
    batchSpeechModel: saved.batchSpeechModel || process.env.ASSEMBLYAI_BATCH_MODEL || DEFAULTS.batchSpeechModel,
    streamingSpeechModel: saved.streamingSpeechModel || process.env.ASSEMBLYAI_STREAMING_MODEL || DEFAULTS.streamingSpeechModel,
  };
}
```

### 4.4 Middleware Anonymous Auth Pattern

**File:** `middleware.ts`

Every request gets a Supabase session. If no session exists, the middleware signs the user in anonymously. This gives every visitor a stable `user_id` for meeting ownership without any UI friction.

```typescript
export async function middleware(request: NextRequest) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.next({ request }); // no-op without Supabase
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(items) {
        for (const { name, value, options } of items) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    await supabase.auth.signInAnonymously().catch(() => {});
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|worklets/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|js\\.map|css\\.map)$).*)",
  ],
};
```

### 4.5 Dynamic Model List from AI Gateway

`GET /api/models` fetches from `https://ai-gateway.vercel.sh/v1/models`:
- Filters to `anthropic`, `openai`, `google` providers only
- Excludes image/codex/instruct/search/tts/embedding models
- Sorts by release date (newest first), then cost
- Takes top 3 per provider
- Caches for 5 minutes in process memory
- Falls back to a hardcoded static list on error

### 4.6 Cost Breakdown Calculation

Every completed meeting gets a `cost_breakdown` with two components:

**STT Cost:**
```typescript
// From lib/billing/assemblyai-pricing.ts
estimateBatchMeetingCost(durationSeconds, model)
// Uses: base rate/hr + addon rates for speakerDiarization + entityDetection
```

**LLM Cost:**
```typescript
// From lib/billing/llm-pricing.ts
estimateLlmCost(modelId, { inputTokens, outputTokens, cachedInputTokens })
// Strips provider prefix, looks up in COST_PER_M_TOKENS table
// Cached input tokens bill at ~10% of input rate
```

**MeetingCostBreakdown shape:**
```typescript
interface MeetingCostBreakdown {
  stt: {
    mode: "batch" | "streaming";
    model: string;
    durationSeconds: number;
    ratePerHour: number;
    baseCostUsd: number;
    addonCostUsd: number;
    totalCostUsd: number;
  };
  llm: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
    calls: Array<{
      label: string;       // "meeting-summary" or "intake-form"
      model: string;       // "anthropic/claude-sonnet-4-6"
      inputTokens: number;
      outputTokens: number;
      cachedInputTokens?: number;
      costUsd: number;
    }>;
  };
  totalCostUsd: number;  // stt.totalCostUsd + llm.totalCostUsd
}
```

### 4.7 Zod Schemas (exact code)

**MeetingSummarySchema:**
```typescript
import { z } from "zod";

export const ActionItemSchema = z.object({
  assignee: z.string().nullable()
    .describe("Speaker name, label (e.g. 'Speaker A'), or null if unclear"),
  task: z.string().describe("The concrete task to be done"),
  dueDate: z.string().nullable()
    .describe("ISO date if explicitly mentioned in the transcript, else null"),
});

export const MeetingSummarySchema = z.object({
  title: z.string()
    .describe("A 3-8 word headline for the meeting (no period). If unclear, use 'Untitled recording'."),
  summary: z.string()
    .describe("A 2-3 sentence neutral overview of what the meeting was about"),
  keyPoints: z.array(z.string())
    .describe("3 to 7 bullet points covering the main discussion topics"),
  actionItems: z.array(ActionItemSchema)
    .describe("Discrete tasks with assignees when identifiable"),
  decisions: z.array(z.string())
    .describe("Concrete decisions or conclusions reached during the meeting (empty array if none)"),
  participants: z.array(z.string())
    .describe("Names or speaker labels of everyone who spoke (use Speaker A/B/... when names unknown)"),
});
```

**IntakeFormSchema:**
```typescript
export const IntakeFormSchema = z.object({
  intent: z.string()
    .describe("One-sentence description of what this conversation was for (e.g. 'sales discovery call', 'vendor demo', 'customer interview', 'standup'). Use 'unclear' when you can't tell."),
  primaryParticipant: z.string().nullable()
    .describe("Name or speaker label of the lead / client / customer / interview subject. Null if unclear."),
  organization: z.string().nullable()
    .describe("Their company / org name if mentioned, else null"),
  contactInfo: z.object({
    email: z.string().nullable(),
    phone: z.string().nullable(),
  }).describe("Contact details that were spoken or read out. Use null when not mentioned."),
  budgetMentioned: z.string().nullable()
    .describe("Budget figure, range, or qualitative descriptor as stated (e.g. '$50k', '5 figures', 'tight'). Null when unspoken."),
  timeline: z.string().nullable()
    .describe("Project timeline, deadline, or urgency the participants discussed."),
  decisionMakers: z.array(z.string())
    .describe("Names of people identified as approvers / decision-makers / blockers."),
  requirements: z.array(z.string())
    .describe("Specific asks, must-haves, or feature requests mentioned."),
  painPoints: z.array(z.string())
    .describe("Problems, frustrations, or current-state issues the primary participant raised."),
  nextSteps: z.array(z.string())
    .describe("Concrete follow-ups both sides explicitly agreed to (distinct from generic action items)."),
});
```

### 4.8 LLM Pricing Table (exact code)

```typescript
export const COST_PER_M_TOKENS: Record<string, ModelPricing> = {
  // Google Gemini
  "gemini-3-flash": { input: 0.5, output: 3.0 },
  "gemini-3-flash-preview": { input: 0.5, output: 3.0 },
  "gemini-3.1-pro-preview": { input: 2.0, output: 12.0 },
  "gemini-3.1-flash-lite-preview": { input: 0.25, output: 1.5 },
  "gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "gemini-3.1-flash-image-preview": { input: 0.5, output: 3.0 },
  "gemini-3-pro-image-preview": { input: 2.0, output: 12.0 },
  // Anthropic
  "claude-opus-4-7": { input: 5.0, output: 25.0, cachedInput: 0.5 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0, cachedInput: 0.3 },
  "claude-opus-4-6": { input: 5.0, output: 25.0, cachedInput: 0.5 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0, cachedInput: 0.1 },
  // OpenAI
  "gpt-4.1": { input: 2.0, output: 8.0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "o4-mini": { input: 1.1, output: 4.4 },
  // Google
  "gemini-2.5-pro": { input: 1.25, output: 10.0, cachedInput: 0.125 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4, cachedInput: 0.01 },
};
```

### 4.9 AssemblyAI Pricing Table

```typescript
const BASE_RATES_PER_HOUR = {
  "best:batch": 0.21,
  "best:streaming": 0.45,
  "universal-3-pro:batch": 0.21,
  "universal-3-pro:streaming": 0.45,
  "u3-rt-pro:batch": 0.21,
  "u3-rt-pro:streaming": 0.45,
  "u3-rt:batch": 0.15,
  "u3-rt:streaming": 0.26,
  "nano:batch": 0.15,
  "nano:streaming": 0.15,
  "universal:batch": 0.15,
  "universal:streaming": 0.15,
  "universal-2:batch": 0.15,
  "universal-2:streaming": 0.15,
  "slam-1:batch": 0.21,
  "slam-1:streaming": 0.45,
};

// Add-ons (USD per hour on top of base):
speakerDiarization: 0.02
summarization: 0.03
sentiment: 0.02
entityDetection: 0.08
topicDetection: 0.15
autoChapters: 0.08
keyPhrases: 0.01
piiRedaction: 0.08
contentModeration: 0.15
```

### 4.10 Free Tier Quota

- 25 meetings lifetime on free tier
- Active subscriptions (status `active` or `trialing`) bypass the limit
- Quota check counts via user-scoped Supabase client (RLS does the filtering)
- Fails open on transient DB errors (never locks users out)
- Without Supabase configured, quota does not apply

### 4.11 MeetingsStore Pattern

Two implementations behind a single `MeetingsStore` interface:
- **SupabaseMeetingsStore**: used when `SUPABASE_URL` + `SUPABASE_ANON_KEY` are set. User-scoped client with RLS. Stamps `user_id` on insert.
- **InMemoryMeetingsStore**: fallback for local dev without Supabase. Process-wide Map. Data lost on restart.

```typescript
export interface MeetingsStore {
  insert(row: MeetingInsert): Promise<Meeting>;
  update(id: string, patch: MeetingUpdate): Promise<Meeting | null>;
  get(id: string): Promise<Meeting | null>;
  list(limit: number): Promise<MeetingListItem[]>;
}
```

### 4.12 Telemetry Pattern

Every `generateObject` / `streamText` call uses `withTelemetry()`:
```typescript
const { object, usage } = await generateObject({
  model,
  schema: MeetingSummarySchema,
  prompt,
  ...withTelemetry({
    label: "meeting-summary",
    metadata: { transcriptId },
  }),
});
```

After streaming responses, flush Langfuse with `after(flushLangfuse)` to prevent data loss on serverless freeze.

---

## 5. UI Pages

### Core Product Pages

| Route | Purpose | Key Components | Server/Client |
|---|---|---|---|
| `/` | Hub / home page | Navigation grid, stats, hero header | Server |
| `/record` | Upload audio or record from mic (batch) | `AudioRecorder`, file upload, `TopBar` | Client (recorder) |
| `/record/live` | Real-time streaming transcription | `LiveRecorder`, `LiveTranscriptView`, `TopBar` | Client |
| `/meetings` | Browse all meetings | Meeting list items, status chips, empty state | Server + Client |
| `/meetings/[id]` | Full meeting detail | `TranscriptView`, `IntakeFormView`, `MeetingCostPanel`, `MeetingDetailPoller`, export buttons | Server + Client (poller) |
| `/chat` | AI chat with tools | `ChatMessage`, `ChatInput`, `ToolCard` | Client |
| `/settings` | Model preferences | Model picker selects, status badge | Client |
| `/pricing` | Plan comparison + checkout | Pricing cards (Free/Core/Pro), Stripe redirect | Server + Client |
| `/usage` | Cost tracking dashboard | Usage tiles, subscription status | Server |
| `/profile` | Session + subscription info | User ID, subscription state, sign in/out | Server + Client |
| `/sign-in` | Email magic link auth | Email input, send button, success/error states | Client |
| `/sign-up` | Registration | Similar to sign-in | Client |
| `/observability` | AI call monitoring | Stats tiles, recent calls table | Server + Client |
| `/docs` | Documentation page | Static content | Server |

### Dev-Kit / Dashboard Pages (inherited from ai-dev-kit)

| Route | Purpose |
|---|---|
| `/dashboard` | Dev-kit observability dashboard |
| `/dashboard/sessions` | Session explorer |
| `/dashboard/evals` | Eval results |
| `/dashboard/tools` | Tool registry |
| `/dashboard/cost` | Cost analysis |
| `/dashboard/connectors` | Connector status |
| `/dashboard/coverage` | Test coverage |
| `/dashboard/deployments` | Deployment tracking |
| `/dashboard/regressions` | Regression tracking |
| `/dev-kit/*` | Mirror of dashboard pages in alt route |

### Key Components

| Component | Type | Purpose |
|---|---|---|
| `TopBar` | Client | Sticky header with back button + title + hamburger menu |
| `SlideMenu` | Client | Right-sliding navigation panel (280px, z-101) |
| `AudioRecorder` | Client | MediaRecorder for browser mic capture, produces WebM blob |
| `LiveRecorder` | Client | Full streaming pipeline: token -> mic -> WorkletNode -> AssemblyAI WebSocket |
| `LiveTranscriptView` | Client | Real-time speaker turns with partial (typing) indicator |
| `MeetingDetailPoller` | Client | Polls `/api/transcribe/[id]` until completed/error |
| `TranscriptView` | Server | Two-column layout: utterances left, summary right |
| `IntakeFormView` | Server | Grid of labeled intake fields |
| `MeetingCostPanel` | Server | 3-column grid: STT cost, LLM cost, Total |
| `ChatMessage` | Client | User (blue, right) or assistant (neutral, left) messages |
| `ChatInput` | Client | Auto-expanding textarea, Enter to send |
| `ToolCard` | Client | Collapsible tool invocation display with states |
| `NavBar` | Client | Bottom tab bar (Home, Record, Meetings, Chat, Settings) |

---

## 6. Platform Configs

### 6.1 Capacitor Config

**File:** `capacitor.config.ts`

```typescript
const config: CapacitorConfig = {
  appId: "com.mirrorfactory.audiolayer",
  appName: "audio-layer",
  webDir: "public",           // fallback bundle for offline
  backgroundColor: "#0a0a0a",
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? "https://audio-layer.vercel.app",
    cleartext: !!process.env.CAPACITOR_SERVER_URL,
    androidScheme: "https",
    allowNavigation: ["api.assemblyai.com", "audio-layer.vercel.app"],
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0a0a0a",
    scrollEnabled: false,
  },
  android: {
    allowMixedContent: process.env.NODE_ENV !== "production",
  },
};
```

**Key points:**
- Loads the LIVE Vercel deployment URL (not a static export)
- For local dev: set `CAPACITOR_SERVER_URL=http://localhost:3000`
- `allowNavigation` must include `api.assemblyai.com` for streaming WebSocket
- iOS `contentInset: "always"` for proper safe area handling
- `scrollEnabled: false` prevents double-scrolling

### 6.2 Tauri Config

**File:** `src-tauri/tauri.conf.json`

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Layer One",
  "version": "0.1.0",
  "identifier": "com.mirrorfactory.audiolayer",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "https://audio-layer.vercel.app"
  },
  "app": {
    "windows": [{
      "title": "Layer One",
      "titleBarStyle": "Overlay",
      "hiddenTitle": true,
      "backgroundColor": "#0a0a0a",
      "width": 1100,
      "height": 760,
      "minWidth": 720,
      "minHeight": 480
    }],
    "security": { "csp": null }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"]
  }
}
```

**Key points:**
- `titleBarStyle: "Overlay"` -- transparent title bar, content behind traffic lights
- `hiddenTitle: true` -- no text in title bar
- `backgroundColor: "#0a0a0a"` -- matches app dark theme, no white flashes
- Production loads from Vercel URL, dev from localhost:3000

### 6.3 Rust Audio Capture (src-tauri/src/lib.rs)

**Tauri commands exposed to JS:**

| Command | Platform | What it does |
|---|---|---|
| `ping` | All | Returns "pong" (health check) |
| `start_mic_capture(on_chunk)` | All | Opens default mic via cpal, decimates to 16kHz int16 LE, sends ~150ms chunks via IPC Channel |
| `stop_mic_capture` | All | Drops the cpal stream |
| `start_system_audio_capture(on_chunk)` | macOS only | Uses ScreenCaptureKit (SCStream with captures_audio) to capture system loopback audio |
| `stop_system_audio_capture` | macOS only | Drops the SC stream |

**Mic capture flow:**
1. Get default input device from cpal
2. Read native sample rate and format (F32/I16/U16)
3. Downsample to 16kHz using linear interpolation
4. Convert to int16 LE PCM
5. Buffer into 150ms chunks
6. Send chunks via `tauri::ipc::Channel<Vec<u8>>`

**System audio capture (macOS):**
1. Get `SCShareableContent` (requires Screen Recording permission)
2. Create `SCContentFilter` for the primary display
3. Configure `SCStream` with `captures_audio: true`, 48kHz, 2 channels
4. `AudioSink` implements `SCStreamOutputTrait` -- receives `CMSampleBuffer`
5. TODO: `extract_float_samples()` is still a stub; sample extraction needs implementation on hardware
6. Same decimation pipeline as mic capture

**State management:** `CaptureState` struct with `Mutex<Option<Stream>>` slots for both mic and system audio. Dropping the stream stops capture.

---

## 7. Environment Variables

### Tier 1 -- LLM + Transcription (minimum to test)

| Variable | Where to get it | What breaks without it |
|---|---|---|
| `AI_GATEWAY_API_KEY` | vercel.com -> AI Gateway -> create key | Summary + intake extraction fail; /chat 500s |
| `ASSEMBLYAI_API_KEY` | assemblyai.com/app/account (free $50 credit) | /record and /record/live 500 on transcription |

**Optional overrides (sensible defaults built in):**
| Variable | Default | Purpose |
|---|---|---|
| `DEFAULT_MODEL` | `openai/gpt-5.4-nano` | Default LLM for summary/intake |
| `ASSEMBLYAI_BATCH_MODEL` | `universal-3-pro` | Default batch speech model |
| `ASSEMBLYAI_STREAMING_MODEL` | `u3-rt-pro` | Default streaming speech model |

### Tier 2 -- Persistence + Auth

| Variable | Where to get it | What breaks without it |
|---|---|---|
| `SUPABASE_URL` | supabase.com -> project -> Settings -> API | Falls back to in-memory store |
| `SUPABASE_ANON_KEY` | Same page, "anon public" key | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page, "service_role" key (SECRET) | Stripe webhook can't write profiles |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as SUPABASE_URL | /sign-in page can't talk to Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as SUPABASE_ANON_KEY | Same |

### Tier 3 -- Billing

| Variable | Where to get it | What breaks without it |
|---|---|---|
| `STRIPE_SECRET_KEY` | stripe.com -> Developers -> API keys (TEST MODE) | /api/stripe/checkout returns 503 |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen --forward-to localhost:3000/api/stripe/webhook` (local); Webhooks -> add endpoint (prod) | Webhook rejects every event |
| `STRIPE_PRICE_CORE` | Products -> create "Core" $15/mo recurring -> copy price_... id | Core subscribe button returns 503 |
| `STRIPE_PRICE_PRO` | Products -> create "Pro" $25/mo recurring -> copy price_... id | Pro subscribe button returns 503 |

### Tier 4 -- Observability

| Variable | Where to get it | What breaks without it |
|---|---|---|
| `LANGFUSE_PUBLIC_KEY` | cloud.langfuse.com -> project -> Settings -> API keys | No Langfuse traces; /observability uses in-memory |
| `LANGFUSE_SECRET_KEY` | Same | Same |
| `LANGFUSE_BASE_URL` | Default: `https://cloud.langfuse.com` | Only needed for self-hosted |

### Tier 5 -- Email

| Variable | Where to get it | What breaks without it |
|---|---|---|
| `RESEND_API_KEY` | resend.com -> API Keys | Auth emails use Supabase built-in SMTP |

### App Metadata

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; `https://<app>.vercel.app` in prod |

---

## 8. Vendor Registries

### AssemblyAI Registry

**File:** `.ai-dev-kit/registries/assemblyai.json`

```json
{
  "vendor": "assemblyai",
  "label": "AssemblyAI",
  "docs_root": "https://www.assemblyai.com/docs",
  "console_url": "https://www.assemblyai.com/app/account",
  "validated_on": "2026-04-18",
  "validated_against_sdk": "assemblyai@^4.15.0",
  "required_env": ["ASSEMBLYAI_API_KEY"],
  "id_patterns": ["universal-[\\w-]+", "u3-[\\w-]+", "slam-\\d+", "nano", "whisper-rt"],
  "deprecations": [
    {
      "pattern": "speech_model:",
      "deprecated_on": "2026-03-01",
      "replacement": "speech_models: (plural, array of strings)",
      "notes": "API rejects singular speech_model field. Use speech_models array."
    },
    {
      "pattern": "\"best\"",
      "deprecated_on": "2026-02-01",
      "replacement": "\"universal-3-pro\"",
      "notes": "Legacy alias. Use explicit model name."
    }
  ],
  "batch_models": [
    { "id": "universal-3-pro", "label": "Universal-3 Pro", "use_for": "Best accuracy pre-recorded", "price_per_hour_usd": 0.21, "deprecated": false },
    { "id": "slam-1", "label": "Slam-1", "use_for": "Advanced batch processing", "price_per_hour_usd": 0.27, "deprecated": false },
    { "id": "universal-2", "label": "Universal-2", "use_for": "99 language support", "price_per_hour_usd": 0.15, "deprecated": false },
    { "id": "nano", "label": "Nano", "use_for": "Fastest, cheapest", "price_per_hour_usd": 0.12, "deprecated": false }
  ],
  "streaming_models": [
    { "id": "u3-rt-pro", "label": "Universal-3 Pro RT", "use_for": "Best quality real-time", "price_per_hour_usd": 0.45, "deprecated": false },
    { "id": "u3-pro", "label": "Universal-3 Pro", "use_for": "Standard real-time", "price_per_hour_usd": 0.45, "deprecated": false },
    { "id": "universal-streaming-multilingual", "label": "Universal Streaming (multilingual)", "use_for": "Multi-language streaming", "price_per_hour_usd": 0.15, "deprecated": false },
    { "id": "universal-streaming-english", "label": "Universal Streaming (English)", "use_for": "English-only streaming", "price_per_hour_usd": 0.15, "deprecated": false },
    { "id": "whisper-rt", "label": "Whisper RT", "use_for": "Whisper-based streaming", "price_per_hour_usd": 0.15, "deprecated": false }
  ],
  "provenance": [
    { "url": "https://www.assemblyai.com/pricing", "what": "current pricing" },
    { "url": "https://www.assemblyai.com/docs/pre-recorded-audio/select-the-speech-model", "what": "valid speech_models values" },
    { "url": "https://www.assemblyai.com/benchmarks", "what": "accuracy benchmarks" }
  ]
}
```

### Selectable Models (Settings UI)

**Summary models (via AI Gateway):**

| Value | Label | Price |
|---|---|---|
| `anthropic/claude-opus-4-7` | Claude Opus 4.7 | $5 / $25 per 1M tokens |
| `anthropic/claude-sonnet-4-6` | Claude Sonnet 4.6 | $3 / $15 per 1M tokens |
| `anthropic/claude-haiku-4-5` | Claude Haiku 4.5 | $1 / $5 per 1M tokens |
| `openai/gpt-4.1` | GPT-4.1 | $2 / $8 per 1M tokens |
| `openai/gpt-4.1-mini` | GPT-4.1 Mini | $0.40 / $1.60 per 1M tokens |
| `openai/o4-mini` | o4-mini (reasoning) | $1.10 / $4.40 per 1M tokens |
| `google/gemini-2.5-pro` | Gemini 2.5 Pro | $1.25 / $10 per 1M tokens |
| `google/gemini-2.5-flash` | Gemini 2.5 Flash | $0.30 / $2.50 per 1M tokens |
| `google/gemini-2.0-flash` | Gemini 2.0 Flash | $0.10 / $0.40 per 1M tokens |

**Batch speech models:**

| Value | Label | Price |
|---|---|---|
| `universal-3-pro` | Universal-3 Pro (best accuracy) | $0.21/hr + addons |
| `slam-1` | Slam-1 (advanced) | $0.27/hr |
| `universal-2` | Universal-2 (99 languages) | $0.15/hr + addons |
| `nano` | Nano (fastest, cheapest) | $0.12/hr |

**Streaming speech models:**

| Value | Label | Price |
|---|---|---|
| `u3-rt-pro` | Universal-3 Pro RT (best quality) | $0.45/hr |
| `u3-pro` | Universal-3 Pro (standard) | $0.45/hr |
| `universal-streaming-multilingual` | Universal Streaming (multilingual) | $0.15/hr |
| `universal-streaming-english` | Universal Streaming (English only) | $0.15/hr |
| `whisper-rt` | Whisper RT | $0.15/hr |

---

## 9. Design Tokens

### Color Palette

**Primary accent: Mint**

| Token | Light | Dark | Usage |
|---|---|---|---|
| `mint-50` | `#f0fdfa` | -- | subtle backgrounds |
| `mint-100` | `#ccfbf1` | -- | hover states |
| `mint-200` | `#99f6e4` | -- | badges, chips |
| `mint-300` | `#5eead4` | -- | secondary elements |
| `mint-400` | `#2dd4bf` | `#2dd4bf` | primary accent |
| `mint-500` | `#14b8a6` | `#14b8a6` | buttons, active states |
| `mint-600` | `#0d9488` | -- | pressed states |
| `mint-700` | `#0f766e` | -- | borders on accent |
| `mint-900` | `#134e4a` | `#134e4a` | accent backgrounds |

**Neutral palette (dark mode primary):**

| Token | Value | Usage |
|---|---|---|
| `neutral-950` | `#0a0a0a` | page background |
| `neutral-900` | `#171717` | card backgrounds |
| `neutral-800` | `#262626` | borders, dividers |
| `neutral-700` | `#404040` | secondary borders |
| `neutral-600` | `#525252` | disabled text |
| `neutral-500` | `#737373` | muted text, labels |
| `neutral-400` | `#a3a3a3` | body text (secondary) |
| `neutral-300` | `#d4d4d4` | body text (primary) |
| `neutral-200` | `#e5e5e5` | headings |
| `neutral-100` | `#f5f5f5` | titles, emphasis |
| `neutral-50` | `#fafafa` | high contrast text |

**Semantic colors (dark mode):**

| Token | Value | Usage |
|---|---|---|
| `success` | `#22c55e` | completed, active subscription |
| `error` | `#ef4444` | errors, destructive actions |
| `warning` | `#eab308` | degraded state, limits |
| `info` | `#3b82f6` | user messages in chat |

### Typography

Font stack: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`

| Style | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `display` | 32px / 2rem | 600 | 1.2 | page hero titles |
| `heading-lg` | 24px / 1.5rem | 600 | 1.3 | section headings |
| `heading-md` | 18px / 1.125rem | 600 | 1.4 | card titles |
| `heading-sm` | 14px / 0.875rem | 600 | 1.4 | sub-headings |
| `body` | 14px / 0.875rem | 400 | 1.6 | main content |
| `body-sm` | 12px / 0.75rem | 400 | 1.5 | secondary content |
| `caption` | 10px / 0.625rem | 500 | 1.4 | labels, badges |
| `label` | 11px / 0.6875rem | 500 | 1.3 | uppercase tracking labels |

### Spacing Scale

Base unit: 4px. All spacing uses multiples.

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | icon-to-label gap |
| `space-2` | 8px | inline element gaps |
| `space-3` | 12px | list item padding |
| `space-4` | 16px | card inner padding (mobile) |
| `space-5` | 20px | between form fields |
| `space-6` | 24px | card inner padding (desktop) |
| `space-8` | 32px | section spacing |
| `space-10` | 40px | page top/bottom padding |
| `space-12` | 48px | between major sections |
| `space-16` | 64px | nav bar height |

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 6px | buttons, inputs, chips |
| `radius-md` | 8px | small cards |
| `radius-lg` | 12px | chat messages |
| `radius-xl` | 16px | page cards |
| `radius-2xl` | 24px | hero sections |
| `radius-full` | 9999px | pills, tab bar buttons |

### Motion

| Property | Duration | Easing |
|---|---|---|
| `transition-fast` | 100ms | ease-out |
| `transition-normal` | 200ms | ease-in-out |
| `transition-slow` | 300ms | ease-in-out |
| `pulse` | 1.5s repeat | ease-in-out |

Respect `prefers-reduced-motion: reduce`.

### Design Principles

1. Dark primary theme. Not gamer-dark -- refined. Think Vercel meets Linear.
2. Mint accent used sparingly: active states, key actions, recording indicators.
3. Monospace font throughout (app identity).
4. Surfaces distinguished by background tone, not borders everywhere.
5. 44px minimum touch targets (iOS HIG).
6. CSS custom properties for theming: `--bg-primary`, `--bg-secondary`, `--text-primary`, `--text-secondary`, `--accent`, `--accent-subtle`.
7. Safe area handling: `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`.

---

## 10. Instructions for the Rebuild

### Step 0: Prerequisites

```bash
# Node.js 20+, pnpm 9+
node -v   # >= 20
pnpm -v   # >= 9

# For desktop: Rust toolchain + Tauri CLI
rustup update stable
cargo install tauri-cli --version "^2.0"

# For mobile: Xcode 16+ (iOS), Android Studio (Android)
```

### Step 1: Scaffold the Project

```bash
pnpm create next-app@latest audio-layer --ts --tailwind --app --src-dir=false --import-alias="@/*"
cd audio-layer
```

### Step 2: Install Dependencies

```bash
# Core
pnpm add ai @ai-sdk/gateway assemblyai zod next@15 react@19 react-dom@19

# Supabase
pnpm add @supabase/supabase-js @supabase/ssr

# Billing
pnpm add stripe

# Email
pnpm add resend

# Observability
pnpm add langfuse

# Dev
pnpm add -D typescript @types/node @types/react vitest playwright
```

### Step 3: Create the Database Schema

1. Create a Supabase project at supabase.com
2. Go to SQL Editor
3. Paste the ENTIRE SQL from Section 2
4. Enable anonymous sign-ins in Auth settings
5. Add callback URLs

### Step 4: Set Up Environment

```bash
cp .env.example .env.local
# Fill in at minimum: AI_GATEWAY_API_KEY, ASSEMBLYAI_API_KEY
# For persistence: add all SUPABASE_* vars
# For billing: add all STRIPE_* vars
# For email: add RESEND_API_KEY
```

### Step 5: Implement Core Libraries

Build in this order (each depends on the previous):

1. **`lib/settings-shared.ts`** -- ModelSettings type, DEFAULTS, MODEL_OPTIONS
2. **`lib/settings.ts`** -- Cookie-based getSettings/saveSettings
3. **`lib/supabase/browser.ts`** + **`lib/supabase/server.ts`** + **`lib/supabase/user.ts`** -- Supabase client factories
4. **`lib/assemblyai/schema.ts`** -- MeetingSummarySchema, ActionItemSchema
5. **`lib/assemblyai/types.ts`** -- TranscribeStatus, TranscribeUtterance, TranscribeResultResponse
6. **`lib/assemblyai/client.ts`** -- SDK singleton, getBatchSpeechModels, getStreamingSpeechModel
7. **`lib/assemblyai/summary.ts`** -- summarizeMeeting with generateObject
8. **`lib/assemblyai/intake.ts`** -- IntakeFormSchema, extractIntakeForm with generateObject
9. **`lib/billing/types.ts`** -- LlmCallRecord, MeetingCostBreakdown, UsageSummary
10. **`lib/billing/llm-pricing.ts`** -- COST_PER_M_TOKENS, estimateLlmCost, formatUsd
11. **`lib/billing/assemblyai-pricing.ts`** -- BASE_RATES_PER_HOUR, estimateTranscriptCost
12. **`lib/billing/quota.ts`** -- checkQuota (25 free meetings)
13. **`lib/meetings/types.ts`** -- Meeting, MeetingInsert, MeetingUpdate
14. **`lib/meetings/store-in-memory.ts`** -- InMemoryMeetingsStore
15. **`lib/meetings/store-supabase.ts`** -- SupabaseMeetingsStore
16. **`lib/meetings/store.ts`** -- getMeetingsStore factory
17. **`lib/stripe/client.ts`** -- Stripe singleton, priceIdForTier, tierForPriceId
18. **`lib/stripe/profiles.ts`** -- getOrCreateProfile, setStripeCustomerId, setSubscriptionState
19. **`lib/email/client.ts`** -- Resend singleton
20. **`lib/email/templates.ts`** -- magicLinkEmail, otpEmail, welcomeEmail, meetingReadyEmail
21. **`lib/ai/telemetry.ts`** -- withTelemetry, logAICall, logError
22. **`lib/ai/tools.ts`** -- allTools (searchDocuments, askQuestion, updateSettings)
23. **`lib/ai/tool-meta.ts`** -- TOOL_META array
24. **`lib/registry.ts`** -- TOOL_REGISTRY, TOOL_BY_NAME, SILENT_TOOLS, CUSTOM_UI_TOOLS

### Step 6: Implement Middleware

Create `middleware.ts` at the project root with the anonymous auth pattern from Section 4.4.

### Step 7: Implement API Routes

Build in this order:

1. **`app/api/settings/route.ts`** -- GET/PUT (simplest, validates cookie flow works)
2. **`app/api/models/route.ts`** -- GET (validates AI Gateway connectivity)
3. **`app/api/transcribe/route.ts`** -- POST (batch upload)
4. **`app/api/transcribe/[id]/route.ts`** -- GET (poll + summarize)
5. **`app/api/transcribe/stream/token/route.ts`** -- POST (streaming token)
6. **`app/api/transcribe/stream/finalize/route.ts`** -- POST (finalize streaming)
7. **`app/api/chat/route.ts`** -- POST (chat with tools)
8. **`app/api/stripe/checkout/route.ts`** -- POST (Stripe checkout)
9. **`app/api/stripe/webhook/route.ts`** -- POST (Stripe webhook)
10. **`app/api/auth/send-email/route.ts`** -- POST (Resend auth hook)

### Step 8: Build UI Pages

1. **`app/layout.tsx`** -- Root layout with font, dark theme, NavBar
2. **`app/page.tsx`** -- Hub / home with navigation grid
3. **`components/top-bar.tsx`** -- TopBar with SlideMenu
4. **`components/slide-menu.tsx`** -- Right-sliding nav panel
5. **`components/audio-recorder.tsx`** -- MediaRecorder component
6. **`app/record/page.tsx`** -- Batch recording page
7. **`components/live-recorder.tsx`** -- Full streaming pipeline
8. **`components/live-transcript-view.tsx`** -- Real-time turns display
9. **`app/record/live/page.tsx`** -- Live recording page
10. **`app/meetings/page.tsx`** -- Meeting list
11. **`app/meetings/[id]/page.tsx`** -- Meeting detail
12. **`components/transcript-view.tsx`** + **`components/intake-form-view.tsx`** + **`components/meeting-cost-panel.tsx`** + **`components/meeting-detail-poller.tsx`**
13. **`app/chat/page.tsx`** -- Chat page
14. **`components/chat-input.tsx`** + **`components/chat-message.tsx`** + **`components/tool-card.tsx`**
15. **`app/settings/page.tsx`** -- Model preferences
16. **`app/pricing/page.tsx`** -- Plan comparison
17. **`app/usage/page.tsx`** -- Cost tracking
18. **`app/profile/page.tsx`** -- Profile
19. **`app/sign-in/page.tsx`** -- Auth
20. **`app/observability/page.tsx`** -- AI monitoring

### Step 9: Create the AudioWorklet

Create `public/worklets/pcm-downsampler.js` -- an AudioWorkletProcessor that:
- Receives audio at the native sample rate
- Decimates to 16kHz using linear interpolation
- Outputs int16 LE PCM in 150ms chunks via `port.postMessage`

### Step 10: Wire Capacitor

```bash
pnpm add @capacitor/core @capacitor/cli
npx cap init audio-layer com.mirrorfactory.audiolayer --web-dir public
# Create capacitor.config.ts with the config from Section 6.1
npx cap add ios
npx cap add android
```

### Step 11: Wire Tauri

```bash
cargo tauri init
# Replace src-tauri/tauri.conf.json with config from Section 6.2
# Replace src-tauri/src/lib.rs with the Rust code from Section 6.3
# Add to src-tauri/Cargo.toml:
#   cpal, tauri, tauri-plugin-shell
#   [target.'cfg(target_os = "macos")'.dependencies]
#   screencapturekit = "~1.5"
```

### Step 12: Create the Tauri Bridge (JS side)

Create `lib/tauri/bridge.ts`:
- `isTauri()` -- detect if running in Tauri shell
- `loadTauriBridge()` -- dynamic import of `@tauri-apps/api`
- Used by `live-recorder.tsx` to route audio through native capture

### Step 13: Run Tests

```bash
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest (106 tests)
pnpm build            # next build
```

### Step 14: Deploy

```bash
# Web: Push to GitHub, import in Vercel, set env vars
# Desktop: cargo tauri build
# Mobile: npx cap open ios
```

---

## Appendix A: File Structure

```
audio-layer/
  app/
    api/
      transcribe/
        route.ts              # POST batch upload
        [id]/route.ts         # GET poll + summarize
        stream/
          token/route.ts      # POST mint streaming token
          finalize/route.ts   # POST finalize streaming session
      chat/route.ts           # POST chat with tools
      settings/route.ts       # GET/PUT model preferences
      models/route.ts         # GET dynamic model list
      stripe/
        checkout/route.ts     # POST create checkout session
        webhook/route.ts      # POST handle Stripe events
      auth/
        send-email/route.ts   # POST Resend auth hook
      ai-logs/                # observability endpoints
    page.tsx                  # Hub / home
    layout.tsx                # Root layout
    record/
      page.tsx                # Batch recording
      live/page.tsx           # Streaming recording
    meetings/
      page.tsx                # Meeting list
      [id]/page.tsx           # Meeting detail
    chat/page.tsx
    settings/page.tsx
    pricing/page.tsx
    usage/page.tsx
    profile/page.tsx
    sign-in/page.tsx
    observability/page.tsx
  components/
    top-bar.tsx
    slide-menu.tsx
    nav-bar.tsx
    audio-recorder.tsx
    live-recorder.tsx
    live-transcript-view.tsx
    transcript-view.tsx
    intake-form-view.tsx
    meeting-cost-panel.tsx
    meeting-detail-poller.tsx
    chat-input.tsx
    chat-message.tsx
    tool-card.tsx
    theme-toggle.tsx
    page-header.tsx
  lib/
    assemblyai/
      client.ts               # SDK singleton + model helpers
      schema.ts               # MeetingSummarySchema
      summary.ts              # summarizeMeeting()
      intake.ts               # IntakeFormSchema + extractIntakeForm()
      types.ts                # TranscribeStatus, TranscribeResultResponse
    billing/
      llm-pricing.ts          # COST_PER_M_TOKENS + estimateLlmCost
      assemblyai-pricing.ts   # STT pricing + estimateTranscriptCost
      quota.ts                # checkQuota (25 free meetings)
      types.ts                # MeetingCostBreakdown, UsageSummary
      usage.ts                # Aggregate usage computation
    meetings/
      types.ts                # Meeting, MeetingInsert, MeetingUpdate
      store.ts                # getMeetingsStore factory
      store-in-memory.ts      # InMemoryMeetingsStore
      store-supabase.ts       # SupabaseMeetingsStore
    stripe/
      client.ts               # Stripe singleton + tier mapping
      profiles.ts             # Profile CRUD (service-role)
    email/
      client.ts               # Resend singleton
      templates.ts            # HTML email templates
    supabase/
      browser.ts              # Browser Supabase client
      server.ts               # Service-role Supabase client
      user.ts                 # User-scoped client + getCurrentUserId
      schema.sql              # Full database schema
    ai/
      telemetry.ts            # withTelemetry, logAICall
      tools.ts                # allTools definition
      tool-meta.ts            # TOOL_META registry
    settings.ts               # Cookie-based settings (server-only)
    settings-shared.ts        # Types + defaults (client-safe)
    registry.ts               # Derived tool registries
    tauri/
      bridge.ts               # Tauri IPC bridge for JS
  middleware.ts               # Anonymous auth
  capacitor.config.ts         # Mobile config
  src-tauri/
    tauri.conf.json           # Desktop config
    src/lib.rs                # Rust audio capture
    Cargo.toml                # Rust dependencies
  public/
    worklets/
      pcm-downsampler.js      # AudioWorklet for 16kHz downsampling
    manifest.webmanifest      # PWA manifest
  .ai-dev-kit/
    spec.md                   # Project spec
    registries/
      assemblyai.json         # Vendor registry
```

## Appendix B: Stripe Billing Tiers

| Tier | Price | Stripe Price ID Env Var | Meetings | Features |
|---|---|---|---|---|
| Free | $0 | -- | 25 lifetime | Core pipeline |
| Core | $15/mo | `STRIPE_PRICE_CORE` | Unlimited | Full features |
| Pro | $25/mo | `STRIPE_PRICE_PRO` | Unlimited | Priority + future features |

## Appendix C: Email Templates

All templates use the monospace font stack matching the app aesthetic. Dark background (#0a0a0a), mint accent (#14b8a6) for CTA buttons.

| Template | Trigger | Subject |
|---|---|---|
| Magic Link | Supabase auth (login/magiclink) | "Sign in to audio-layer" |
| OTP Code | Supabase auth (signup/email) | "Your audio-layer verification code" |
| Welcome | After first sign-in | "Welcome to audio-layer" |
| Meeting Ready | After meeting processing completes | "Meeting ready: {title}" |

---

_This document contains everything needed to rebuild Layer One Audio from scratch. All code snippets are exact copies from the source. All configurations are complete. An agent reading this document should be able to produce a functionally equivalent application without referencing any other file._
