-- Calendar connections for surfacing upcoming meetings before recording.
-- OAuth token encryption/wiring is implemented in the application layer; this
-- table stores one connection row per user/provider.

create table if not exists calendar_connections (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  provider               text not null check (provider in ('google', 'outlook')),
  provider_account_email text,
  status                 text not null default 'connected'
                         check (status in ('connected', 'expired', 'revoked')),
  scopes                 text[] not null default '{}',
  access_token_enc       text,
  refresh_token_enc      text,
  token_expires_at       timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists calendar_connections_user_status_idx
  on calendar_connections(user_id, status, updated_at desc);

create unique index if not exists calendar_connections_user_provider_key
  on calendar_connections(user_id, provider);

drop trigger if exists calendar_connections_touch on calendar_connections;
create trigger calendar_connections_touch
before update on calendar_connections
for each row execute function meetings_touch_updated_at();

alter table calendar_connections enable row level security;

drop policy if exists "calendar_connections_owner_select" on calendar_connections;
create policy "calendar_connections_owner_select"
  on calendar_connections for select
  using (auth.uid() = user_id);

drop policy if exists "calendar_connections_owner_delete" on calendar_connections;
create policy "calendar_connections_owner_delete"
  on calendar_connections for delete
  using (auth.uid() = user_id);

-- Inserts and updates should happen server-side after provider OAuth exchange
-- so encrypted tokens are never writable from the browser.
