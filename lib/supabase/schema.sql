-- ═══════════════════════════════════════════════════════════════════
-- audio-layer — meetings schema
-- ═══════════════════════════════════════════════════════════════════
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
  id               text        primary key,           -- AssemblyAI transcript id
  status           text        not null default 'processing',  -- queued | processing | completed | error
  title            text,                                        -- generated 3-8 word headline
  text             text,                                        -- full joined transcript
  utterances       jsonb       not null default '[]'::jsonb,    -- speaker-segmented turns
  duration_seconds real,
  summary          jsonb,                                       -- MeetingSummarySchema output
  error            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists meetings_created_at_idx
  on meetings (created_at desc);

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

-- RLS is disabled for V1 because the only writer is our server
-- (service-role key). When we add user auth, enable RLS and scope by
-- a user_id column.
alter table meetings disable row level security;
