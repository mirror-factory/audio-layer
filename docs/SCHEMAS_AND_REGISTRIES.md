# Schemas and Registries Reference

Complete reference of every Zod schema, TypeScript interface, database schema, and vendor registry in the audio-layer project.

---

## Table of Contents

1. [Zod Schemas](#zod-schemas)
   - [MeetingSummarySchema (lib/assemblyai/schema.ts)](#meetingsummaryschema)
   - [IntakeFormSchema (lib/assemblyai/intake.ts)](#intakeformschema)
2. [TypeScript Interfaces](#typescript-interfaces)
   - [Transcribe Types (lib/assemblyai/types.ts)](#transcribe-types)
   - [Meeting Types (lib/meetings/types.ts)](#meeting-types)
   - [Billing Types (lib/billing/types.ts)](#billing-types)
   - [Settings Types (lib/settings-shared.ts)](#settings-types)
3. [Supabase SQL Schema (lib/supabase/schema.sql)](#supabase-sql-schema)
4. [Vendor Registries](#vendor-registries)
   - [AssemblyAI](#assemblyai-registry)
   - [Stripe](#stripe-registry)
   - [Supabase](#supabase-registry)
   - [Resend](#resend-registry)
   - [Langfuse](#langfuse-registry)

---

## Zod Schemas

### MeetingSummarySchema

**File:** `lib/assemblyai/schema.ts`

Structured meeting summary schema. The Gateway-routed LLM (Claude Sonnet 4.6 by default) produces this shape via `generateObject` after AssemblyAI returns a completed transcript.

```ts
import { z } from "zod";

export const ActionItemSchema = z.object({
  assignee: z
    .string()
    .nullable()
    .describe("Speaker name, label (e.g. 'Speaker A'), or null if unclear"),
  task: z.string().describe("The concrete task to be done"),
  dueDate: z
    .string()
    .nullable()
    .describe("ISO date if explicitly mentioned in the transcript, else null"),
});

export const MeetingSummarySchema = z.object({
  title: z
    .string()
    .describe(
      "A 3-8 word headline for the meeting (no period). If unclear, use 'Untitled recording'.",
    ),
  summary: z
    .string()
    .describe("A 2-3 sentence neutral overview of what the meeting was about"),
  keyPoints: z
    .array(z.string())
    .describe("3 to 7 bullet points covering the main discussion topics"),
  actionItems: z
    .array(ActionItemSchema)
    .describe("Discrete tasks with assignees when identifiable"),
  decisions: z
    .array(z.string())
    .describe(
      "Concrete decisions or conclusions reached during the meeting (empty array if none)",
    ),
  participants: z
    .array(z.string())
    .describe(
      "Names or speaker labels of everyone who spoke (use Speaker A/B/... when names unknown)",
    ),
});

export type ActionItem = z.infer<typeof ActionItemSchema>;
export type MeetingSummary = z.infer<typeof MeetingSummarySchema>;
```

#### MeetingSummarySchema Field Reference

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `title` | `string` | No | A 3-8 word headline for the meeting (no period). If unclear, use 'Untitled recording'. |
| `summary` | `string` | No | A 2-3 sentence neutral overview of what the meeting was about |
| `keyPoints` | `string[]` | No | 3 to 7 bullet points covering the main discussion topics |
| `actionItems` | `ActionItem[]` | No | Discrete tasks with assignees when identifiable |
| `decisions` | `string[]` | No | Concrete decisions or conclusions reached during the meeting (empty array if none) |
| `participants` | `string[]` | No | Names or speaker labels of everyone who spoke (use Speaker A/B/... when names unknown) |

#### ActionItemSchema Field Reference

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `assignee` | `string` | Yes | Speaker name, label (e.g. 'Speaker A'), or null if unclear |
| `task` | `string` | No | The concrete task to be done |
| `dueDate` | `string` | Yes | ISO date if explicitly mentioned in the transcript, else null |

---

### IntakeFormSchema

**File:** `lib/assemblyai/intake.ts`

IntakeForm -- structured data extracted from a conversation. The differentiator from competitors: instead of just summarizing, we pull the structured intake fields a sales / customer-success / vendor / interview workflow actually needs. Runs as a second `generateObject` call after summarization (cheap, parallelizable).

Every field is nullable / array-empty by default -- the model is instructed to leave fields blank rather than invent data, so a casual chat doesn't get hallucinated CRM fields.

```ts
import { z } from "zod";

export const IntakeFormSchema = z.object({
  intent: z
    .string()
    .describe(
      "One-sentence description of what this conversation was for (e.g. 'sales discovery call', 'vendor demo', 'customer interview', 'standup'). Use 'unclear' when you can't tell.",
    ),
  primaryParticipant: z
    .string()
    .nullable()
    .describe(
      "Name or speaker label of the lead / client / customer / interview subject -- the person the conversation centers on. Null if unclear.",
    ),
  organization: z
    .string()
    .nullable()
    .describe("Their company / org name if mentioned, else null"),
  contactInfo: z
    .object({
      email: z.string().nullable(),
      phone: z.string().nullable(),
    })
    .describe(
      "Contact details that were spoken or read out. Use null when not mentioned.",
    ),
  budgetMentioned: z
    .string()
    .nullable()
    .describe(
      "Budget figure, range, or qualitative descriptor as stated (e.g. '$50k', '5 figures', 'tight'). Null when unspoken.",
    ),
  timeline: z
    .string()
    .nullable()
    .describe(
      "Project timeline, deadline, or urgency the participants discussed.",
    ),
  decisionMakers: z
    .array(z.string())
    .describe(
      "Names of people identified as approvers / decision-makers / blockers (may be people not in the conversation).",
    ),
  requirements: z
    .array(z.string())
    .describe("Specific asks, must-haves, or feature requests mentioned."),
  painPoints: z
    .array(z.string())
    .describe(
      "Problems, frustrations, or current-state issues the primary participant raised.",
    ),
  nextSteps: z
    .array(z.string())
    .describe(
      "Concrete follow-ups both sides explicitly agreed to (distinct from generic action items).",
    ),
});

export type IntakeForm = z.infer<typeof IntakeFormSchema>;
```

#### IntakeFormSchema Field Reference

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `intent` | `string` | No | One-sentence description of what this conversation was for. Use 'unclear' when you can't tell. |
| `primaryParticipant` | `string` | Yes | Name or speaker label of the lead / client / customer / interview subject. Null if unclear. |
| `organization` | `string` | Yes | Their company / org name if mentioned, else null |
| `contactInfo` | `{ email: string \| null, phone: string \| null }` | No (fields nullable) | Contact details that were spoken or read out. Use null when not mentioned. |
| `budgetMentioned` | `string` | Yes | Budget figure, range, or qualitative descriptor as stated. Null when unspoken. |
| `timeline` | `string` | Yes | Project timeline, deadline, or urgency the participants discussed. |
| `decisionMakers` | `string[]` | No (empty array) | Names of people identified as approvers / decision-makers / blockers. |
| `requirements` | `string[]` | No (empty array) | Specific asks, must-haves, or feature requests mentioned. |
| `painPoints` | `string[]` | No (empty array) | Problems, frustrations, or current-state issues the primary participant raised. |
| `nextSteps` | `string[]` | No (empty array) | Concrete follow-ups both sides explicitly agreed to (distinct from generic action items). |

#### Helper: emptyIntakeForm()

```ts
export function emptyIntakeForm(): IntakeForm {
  return {
    intent: "unclear",
    primaryParticipant: null,
    organization: null,
    contactInfo: { email: null, phone: null },
    budgetMentioned: null,
    timeline: null,
    decisionMakers: [],
    requirements: [],
    painPoints: [],
    nextSteps: [],
  };
}
```

#### Helper Interfaces

```ts
interface ExtractOptions {
  transcriptId: string;
  utterances: UtteranceLike[];
  fullText?: string;
  modelId?: string;
}

export interface ExtractIntakeResult {
  intake: IntakeForm;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
  };
  skipped: boolean;
}
```

---

## TypeScript Interfaces

### Transcribe Types

**File:** `lib/assemblyai/types.ts`

Shared types for the transcribe API routes. Keeps the Client<->Server contract in one place so the /record page and the /api/transcribe routes fail typecheck together if either drifts.

```ts
import type { MeetingSummary } from "./schema";
import type { IntakeForm } from "./intake";

export type TranscribeStatus = "queued" | "processing" | "completed" | "error";

export interface TranscribeStartResponse {
  id: string;
  status: TranscribeStatus;
}

export interface TranscribeUtterance {
  speaker: string | null;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscribeResultResponse {
  id: string;
  status: TranscribeStatus;
  /** Present when status === 'completed' */
  text?: string;
  utterances?: TranscribeUtterance[];
  durationSeconds?: number;
  summary?: MeetingSummary;
  intakeForm?: IntakeForm;
  /** Present when status === 'error' */
  error?: string;
}
```

---

### Meeting Types

**File:** `lib/meetings/types.ts`

Meeting record -- the persistent form of a transcription job. The id is the AssemblyAI transcript id (see lib/supabase/schema.sql). Utterances and summary are stored as jsonb in Supabase and as native objects in the in-memory store.

```ts
import type {
  TranscribeStatus,
  TranscribeUtterance,
} from "@/lib/assemblyai/types";
import type { MeetingSummary } from "@/lib/assemblyai/schema";
import type { IntakeForm } from "@/lib/assemblyai/intake";
import type { MeetingCostBreakdown } from "@/lib/billing/types";

export interface Meeting {
  id: string;
  status: TranscribeStatus;
  title: string | null;
  text: string | null;
  utterances: TranscribeUtterance[];
  durationSeconds: number | null;
  summary: MeetingSummary | null;
  intakeForm: IntakeForm | null;
  costBreakdown: MeetingCostBreakdown | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingListItem {
  id: string;
  status: TranscribeStatus;
  title: string | null;
  durationSeconds: number | null;
  createdAt: string;
}

export interface MeetingInsert {
  id: string;
  status?: TranscribeStatus;
  title?: string | null;
}

export interface MeetingUpdate {
  status?: TranscribeStatus;
  title?: string | null;
  text?: string | null;
  utterances?: TranscribeUtterance[];
  durationSeconds?: number | null;
  summary?: MeetingSummary | null;
  intakeForm?: IntakeForm | null;
  costBreakdown?: MeetingCostBreakdown | null;
  error?: string | null;
}
```

---

### Billing Types

**File:** `lib/billing/types.ts`

Shared shapes for per-meeting cost tracking + /usage aggregation. Persisted on `meetings.cost_breakdown` jsonb. Round-tripped through both MeetingsStore implementations (in-memory + Supabase).

```ts
export interface LlmCallRecord {
  /** Semantic label matching withTelemetry({ label }) -- e.g. "meeting-summary". */
  label: string;
  /** Full model id including provider prefix (e.g. "anthropic/claude-sonnet-4-6"). */
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  /** Computed locally from COST_PER_M_TOKENS; USD. */
  costUsd: number;
}

export interface SttCostDetail {
  mode: "batch" | "streaming";
  /** AssemblyAI speech_model (or our streaming model id) used for this meeting. */
  model: string;
  durationSeconds: number;
  ratePerHour: number;
  baseCostUsd: number;
  addonCostUsd: number;
  totalCostUsd: number;
}

export interface LlmCostDetail {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  calls: LlmCallRecord[];
}

export interface MeetingCostBreakdown {
  stt: SttCostDetail;
  llm: LlmCostDetail;
  totalCostUsd: number;
}

export interface UsageSummary {
  meetings: {
    total: number;
    thisMonth: number;
    freeLimit: number;
    freeRemaining: number;
  };
  minutes: {
    total: number;
    thisMonth: number;
  };
  stt: {
    totalCostUsd: number;
    thisMonthCostUsd: number;
  };
  llm: {
    totalCostUsd: number;
    thisMonthCostUsd: number;
    totalTokens: number;
    /** Which source the LLM numbers came from. */
    source: "langfuse" | "local" | "unavailable";
  };
  subscription: {
    tier: "core" | "pro" | null;
    status: string | null;
    currentPeriodEnd: string | null;
  };
}
```

---

### Settings Types

**File:** `lib/settings-shared.ts`

Shared types and constants for model settings. Safe to import from both client and server components.

```ts
export interface ModelSettings {
  /** LLM for summary + intake extraction (AI Gateway format). */
  summaryModel: string;
  /** AssemblyAI batch (pre-recorded) speech model. */
  batchSpeechModel: string;
  /** AssemblyAI streaming (real-time) speech model. */
  streamingSpeechModel: string;
}

export const DEFAULTS: ModelSettings = {
  summaryModel: "openai/gpt-5.4-nano",
  batchSpeechModel: "universal-2",
  streamingSpeechModel: "universal-streaming-multilingual",
};

export interface ModelOption {
  value: string;
  label: string;
  /** Price description shown in the UI. */
  price: string;
}
```

#### MODEL_OPTIONS (full constant)

```ts
export const MODEL_OPTIONS = {
  summary: [
    // Anthropic (April 2026)
    { value: "anthropic/claude-opus-4-7", label: "Claude Opus 4.7", price: "$5 / $25 per 1M tokens" },
    { value: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6", price: "$3 / $15 per 1M tokens" },
    { value: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5", price: "$1 / $5 per 1M tokens" },
    // OpenAI (April 2026)
    { value: "openai/gpt-4.1", label: "GPT-4.1", price: "$2 / $8 per 1M tokens" },
    { value: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini", price: "$0.40 / $1.60 per 1M tokens" },
    { value: "openai/o4-mini", label: "o4-mini (reasoning)", price: "$1.10 / $4.40 per 1M tokens" },
    // Google (April 2026)
    { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", price: "$1.25 / $10 per 1M tokens" },
    { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", price: "$0.30 / $2.50 per 1M tokens" },
    { value: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash", price: "$0.10 / $0.40 per 1M tokens" },
  ] as ModelOption[],
  batchSpeech: [
    { value: "universal-3-pro", label: "Universal-3 Pro (best accuracy)", price: "$0.21/hr + addons" },
    { value: "slam-1", label: "Slam-1 (advanced)", price: "$0.27/hr" },
    { value: "universal-2", label: "Universal-2 (99 languages)", price: "$0.15/hr + addons" },
    { value: "nano", label: "Nano (fastest, cheapest)", price: "$0.12/hr" },
  ] as ModelOption[],
  streamingSpeech: [
    { value: "u3-rt-pro", label: "Universal-3 Pro RT (best quality)", price: "$0.45/hr" },
    { value: "u3-pro", label: "Universal-3 Pro (standard)", price: "$0.45/hr" },
    { value: "universal-streaming-multilingual", label: "Universal Streaming (multilingual)", price: "$0.15/hr" },
    { value: "universal-streaming-english", label: "Universal Streaming (English only)", price: "$0.15/hr" },
    { value: "whisper-rt", label: "Whisper RT", price: "$0.15/hr" },
  ] as ModelOption[],
} as const;
```

---

## Supabase SQL Schema

**File:** `lib/supabase/schema.sql`

Full SQL schema for the `meetings` and `profiles` tables, including indexes, triggers, and row-level security policies.

```sql
-- =====================================================================
-- audio-layer -- meetings schema
-- =====================================================================
--
-- Run once against your Supabase Postgres (SQL Editor, or psql):
--
--   supabase db push                       # if using supabase CLI
--   psql "$SUPABASE_DB_URL" -f schema.sql  # direct
--
-- The `meetings` table is keyed by the AssemblyAI transcript id so we
-- don't need a mapping column. `utterances` and `summary` are stored as
-- jsonb to avoid relational bloat for V1. Tighten later if queries grow.

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

-- Idempotent migration steps for existing rows.
alter table meetings add column if not exists intake_form jsonb;
alter table meetings add column if not exists cost_breakdown jsonb;
-- `cost_breakdown` shape is owned by lib/billing/types.ts:
--   {
--     stt:  { mode, model, durationSeconds, ratePerHour, baseCostUsd,
--             addonCostUsd, totalCostUsd },
--     llm:  { totalInputTokens, totalOutputTokens, totalCostUsd,
--             calls: [{ label, model, inputTokens, outputTokens,
--                       costUsd }] },
--     totalCostUsd: number   # stt.totalCostUsd + llm.totalCostUsd
--   }

-- Keep updated_at fresh on every write.
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

-- -- Profiles (Stripe billing) ------------------------------------------------
-- One row per auth.users; created lazily by the Stripe checkout flow.
-- Keeps the meetings table free of billing concerns.

create table if not exists profiles (
  user_id              uuid        primary key references auth.users (id) on delete cascade,
  stripe_customer_id   text        unique,
  subscription_status  text,                                   -- active | trialing | past_due | canceled | null
  subscription_tier    text,                                   -- core | pro | null
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
-- inserts and updates happen server-side with the service-role key
-- (the Stripe webhook is anonymous from the user's perspective), so
-- we don't grant anon-role write access.

-- -- Row level security -------------------------------------------------------
-- Each authenticated user (including anonymous Supabase auth users)
-- can only see and modify their own meetings. The server-side
-- `getSupabaseUser()` client uses the anon key + the request cookie,
-- so RLS does the filtering automatically.

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

### meetings table columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `text` | PRIMARY KEY | AssemblyAI id (batch) or UUID (streaming) |
| `user_id` | `uuid` | FK -> auth.users, ON DELETE CASCADE | Owner |
| `status` | `text` | NOT NULL DEFAULT 'processing' | queued / processing / completed / error |
| `title` | `text` | nullable | Generated 3-8 word headline |
| `text` | `text` | nullable | Full joined transcript |
| `utterances` | `jsonb` | NOT NULL DEFAULT '[]' | Speaker-segmented turns |
| `duration_seconds` | `real` | nullable | Audio duration |
| `summary` | `jsonb` | nullable | MeetingSummarySchema output |
| `intake_form` | `jsonb` | nullable | IntakeFormSchema output |
| `cost_breakdown` | `jsonb` | nullable | MeetingCostBreakdown shape |
| `error` | `text` | nullable | Error message |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | Row creation time |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | Auto-updated by trigger |

### profiles table columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | `uuid` | PRIMARY KEY, FK -> auth.users, ON DELETE CASCADE | Owner |
| `stripe_customer_id` | `text` | UNIQUE | Stripe customer ID |
| `subscription_status` | `text` | nullable | active / trialing / past_due / canceled / null |
| `subscription_tier` | `text` | nullable | core / pro / null |
| `current_period_end` | `timestamptz` | nullable | Subscription period end |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | Row creation time |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | Auto-updated by trigger |

### RLS Policies

| Table | Policy | Operation | Rule |
|-------|--------|-----------|------|
| meetings | meetings_owner_select | SELECT | `auth.uid() = user_id` |
| meetings | meetings_owner_insert | INSERT | `auth.uid() = user_id` |
| meetings | meetings_owner_update | UPDATE | `auth.uid() = user_id` (both USING and WITH CHECK) |
| meetings | meetings_owner_delete | DELETE | `auth.uid() = user_id` |
| profiles | profiles_owner_select | SELECT | `auth.uid() = user_id` |

---

## Vendor Registries

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

---

### Stripe Registry

**File:** `.ai-dev-kit/registries/stripe.json`

```json
{
  "vendor": "stripe",
  "label": "Stripe",
  "docs_root": "https://stripe.com/docs",
  "console_url": "https://dashboard.stripe.com",
  "validated_on": "2026-04-18",
  "validated_against_sdk": "stripe@^22.0.2",
  "required_env": ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_CORE", "STRIPE_PRICE_PRO"],
  "provenance": [
    { "url": "https://stripe.com/docs/api", "what": "API reference" },
    { "url": "https://stripe.com/docs/webhooks", "what": "webhook setup" }
  ]
}
```

---

### Supabase Registry

**File:** `.ai-dev-kit/registries/supabase.json`

```json
{
  "vendor": "supabase",
  "label": "Supabase",
  "docs_root": "https://supabase.com/docs",
  "console_url": "https://supabase.com/dashboard",
  "validated_on": "2026-04-18",
  "validated_against_sdk": "@supabase/supabase-js@^2.47.0",
  "required_env": ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  "provenance": [
    { "url": "https://supabase.com/docs/guides/auth", "what": "auth setup" },
    { "url": "https://supabase.com/docs/guides/database", "what": "database and RLS" }
  ]
}
```

---

### Resend Registry

**File:** `.ai-dev-kit/registries/resend.json`

```json
{
  "vendor": "resend",
  "label": "Resend",
  "docs_root": "https://resend.com/docs",
  "console_url": "https://resend.com/overview",
  "validated_on": "2026-04-18",
  "validated_against_sdk": "resend@latest",
  "required_env": ["RESEND_API_KEY"],
  "provenance": [
    { "url": "https://resend.com/docs/send-with-supabase-smtp", "what": "Supabase SMTP integration" },
    { "url": "https://resend.com/docs/api-reference/emails/send-email", "what": "send email API" }
  ]
}
```

---

### Langfuse Registry

**File:** `.ai-dev-kit/registries/langfuse.json`

```json
{
  "vendor": "langfuse",
  "label": "Langfuse",
  "docs_root": "https://langfuse.com/docs",
  "console_url": "https://cloud.langfuse.com",
  "validated_on": "2026-04-18",
  "validated_against_sdk": "@langfuse/otel@^4.6.1",
  "required_env": ["LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY", "LANGFUSE_BASE_URL"],
  "provenance": [
    { "url": "https://langfuse.com/docs/integrations/vercel-ai-sdk", "what": "Vercel AI SDK integration" },
    { "url": "https://langfuse.com/docs/tracing", "what": "tracing setup" }
  ]
}
```

---

## All Required Environment Variables (consolidated)

| Vendor | Variable |
|--------|----------|
| AssemblyAI | `ASSEMBLYAI_API_KEY` |
| Stripe | `STRIPE_SECRET_KEY` |
| Stripe | `STRIPE_WEBHOOK_SECRET` |
| Stripe | `STRIPE_PRICE_CORE` |
| Stripe | `STRIPE_PRICE_PRO` |
| Supabase | `SUPABASE_URL` |
| Supabase | `SUPABASE_ANON_KEY` |
| Supabase | `SUPABASE_SERVICE_ROLE_KEY` |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` |
| Supabase | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Resend | `RESEND_API_KEY` |
| Langfuse | `LANGFUSE_PUBLIC_KEY` |
| Langfuse | `LANGFUSE_SECRET_KEY` |
| Langfuse | `LANGFUSE_BASE_URL` |
