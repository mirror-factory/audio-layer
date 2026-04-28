-- Hardened MCP OAuth support.
-- Authorization codes are one-time, short-lived, and PKCE-bound. Refresh
-- tokens are stored only as SHA-256 hashes and can be revoked independently.

create table if not exists oauth_codes (
  code uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_uri text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table oauth_codes add column if not exists client_id text;
alter table oauth_codes add column if not exists code_challenge text;
alter table oauth_codes add column if not exists code_challenge_method text not null default 'S256';
alter table oauth_codes add column if not exists scope text not null default 'mcp:tools';

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

alter table oauth_codes enable row level security;
alter table oauth_refresh_tokens enable row level security;

-- No anon/auth policies: OAuth code and refresh-token records are written and
-- read only by service-role API routes.
