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
