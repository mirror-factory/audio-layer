-- OAuth authorization codes (short-lived, one-time use)
-- Used by the MCP OAuth flow to exchange a sign-in for an access token
create table if not exists oauth_codes (
  code uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_uri text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Auto-cleanup expired codes
create index if not exists idx_oauth_codes_expires
  on oauth_codes(expires_at);

-- RLS: only service role can access (no direct user access)
alter table oauth_codes enable row level security;

-- No user policies — only the service role key accesses this table
