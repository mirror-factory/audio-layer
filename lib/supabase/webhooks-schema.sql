-- Webhook configuration table
create table if not exists webhooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  events text[] not null default '{"meeting.completed"}',
  secret text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS: users can only see/manage their own webhooks
alter table webhooks enable row level security;

create policy "Users manage own webhooks"
  on webhooks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Webhook delivery log (for debugging)
create table if not exists webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references webhooks(id) on delete cascade,
  event text not null,
  meeting_id text not null,
  status_code int,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

alter table webhook_deliveries enable row level security;

create policy "Users view own webhook deliveries"
  on webhook_deliveries for select
  using (
    webhook_id in (select id from webhooks where user_id = auth.uid())
  );

-- Index for looking up active webhooks by user
create index if not exists idx_webhooks_user_active
  on webhooks(user_id) where active = true;
