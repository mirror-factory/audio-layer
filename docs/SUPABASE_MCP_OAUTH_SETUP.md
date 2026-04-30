# Supabase MCP OAuth Setup

This migration is required before Claude-style OAuth MCP connectors can complete the authorization-code flow. Without it, the app can expose metadata and render consent, but token exchange will fail because the live database is missing PKCE and refresh-token storage.

## What To Apply

Run this SQL file against the Layers Supabase project:

```text
supabase/migrations/00003_mcp_oauth.sql
```

It adds:

- PKCE columns on `oauth_codes`: `client_id`, `code_challenge`, `code_challenge_method`, and `scope`.
- `oauth_refresh_tokens` with hashed refresh-token storage.
- Expiration indexes for code and refresh-token cleanup.
- RLS enabled on both OAuth tables, with no anon/auth policies so only service-role API routes can read or write these rows.

## App Environment

Set a stable signing secret anywhere the app runs OAuth MCP token exchange:

```bash
MCP_JWT_SECRET=replace-with-a-long-random-secret
```

If this value is missing, local development falls back to an insecure default so
tests can run, but production connectors should not use the fallback secret.

## Dashboard Steps

1. Open the Supabase dashboard for the Layers project.
2. Go to `SQL Editor`.
3. Create a new query.
4. Paste the full contents of `supabase/migrations/00003_mcp_oauth.sql`.
5. Click `Run`.
6. Confirm there are no errors.

## Verify In SQL Editor

Run:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'oauth_codes'
  and column_name in (
    'client_id',
    'code_challenge',
    'code_challenge_method',
    'scope'
  )
order by column_name;
```

Expected rows:

```text
client_id
code_challenge
code_challenge_method
scope
```

Then run:

```sql
select to_regclass('public.oauth_refresh_tokens') as refresh_tokens_table;
```

Expected:

```text
oauth_refresh_tokens
```

Check RLS:

```sql
select relname, relrowsecurity
from pg_class
where oid in (
  'public.oauth_codes'::regclass,
  'public.oauth_refresh_tokens'::regclass
);
```

Expected: `relrowsecurity` is `true` for both tables.

## CLI Alternative

If you have a direct Postgres connection string, you can apply the same file locally:

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/00003_mcp_oauth.sql
```

Do not use the anon key or service-role key for this step. They can call REST endpoints, but they cannot run DDL migrations.

## Local Smoke Checks

After the migration is applied and the app is running:

```bash
curl -sS http://localhost:3001/.well-known/oauth-authorization-server | jq .
curl -sS http://localhost:3001/.well-known/oauth-protected-resource | jq .
```

Both should return JSON metadata.

For a real Claude connector test, use an HTTPS app URL such as the Vercel deployment or a trusted tunnel. OAuth redirect URIs must be HTTPS, except localhost loopback URLs during development.

## Common Failures

- `column oauth_codes.client_id does not exist`: the migration has not been applied to the live Supabase project.
- `Could not find the table public.oauth_refresh_tokens`: the migration has not been applied.
- `invalid_redirect_uri`: the client is using non-HTTPS redirect URI outside localhost.
- `invalid_grant`: the authorization code expired, was already used, or the PKCE verifier does not match.
