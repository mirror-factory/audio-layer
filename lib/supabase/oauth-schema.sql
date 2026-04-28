-- OAuth authorization codes (short-lived, one-time use)
-- Used by the MCP OAuth flow to exchange a sign-in for an access token
create table if not exists oauth_codes (
  code uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  redirect_uri text not null,
  code_challenge text not null,
  code_challenge_method text not null default 'S256',
  scope text not null default 'mcp:tools',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Auto-cleanup expired codes
create index if not exists oauth_codes_expires_at_idx
  on oauth_codes(expires_at);

create table if not exists oauth_refresh_tokens (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  scope text not null default 'mcp:tools',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists oauth_refresh_tokens_user_id_idx
  on oauth_refresh_tokens(user_id);

create index if not exists oauth_refresh_tokens_expires_at_idx
  on oauth_refresh_tokens(expires_at);

-- RLS: only service role can access (no direct user access)
alter table oauth_codes enable row level security;
alter table oauth_refresh_tokens enable row level security;

-- No user policies — only the service role key accesses this table
