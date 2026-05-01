# Release Flow — `development` → `staging` → `main`

Tracks: [PROD-383](https://linear.app/mirror-factory/issue/PROD-383)

## Why three tiers

We ship near-daily and we've already had production bugs that a soak environment
would have caught (PROD-378 OAuth typo, PROD-379 post-auth redirect, PROD-380
unsigned macOS DMG). Pushing direct to `main` ships those to real users. Three
tiers gives every change two chances to fail before it reaches them — and one
canonical place to test against staging credentials.

## The branches

| Branch        | Vercel                | Domain                            | Stripe       | Supabase                | Purpose                                                    |
| ------------- | --------------------- | --------------------------------- | ------------ | ----------------------- | ---------------------------------------------------------- |
| `main`        | **Production**        | `layers.mirrorfactory.ai`         | live keys    | prod project            | Real users. Promote from `staging` only.                   |
| `staging`     | Preview (pinned)      | `staging.layers.mirrorfactory.ai` | test keys    | staging project         | Pre-prod soak. Final QA before promoting to `main`.        |
| `development` | Preview (pinned)      | `dev.layers.mirrorfactory.ai`     | test keys    | dev project (or branch) | Active feature integration. Feature PRs land here first.   |
| feature/\*    | Preview (per-PR)      | Vercel-generated preview URL      | test keys    | dev project             | One per change. Vercel auto-creates a preview deploy.      |

## Day-to-day flow

1. **Cut a feature branch** off `development`:
   ```bash
   git checkout development && git pull
   git checkout -b alfonso/prod-321-new-thing
   ```
2. **Push and open a PR into `development`.** Vercel posts a preview URL on the PR. Manual smoke + reviewer required.
3. **Merge into `development`.** Vercel rebuilds `dev.layers.mirrorfactory.ai`. The whole team gets the change against dev creds. Soak overnight.
4. **Promote to `staging`.** Open a PR `development` → `staging`. CI runs the full gate suite (typecheck, unit, e2e, smoke). Reviewer required. Merge.
5. **Verify on `staging.layers.mirrorfactory.ai`.** Sign in with a staging account, exercise the changed surface, watch error rates, run any manual checks listed in the PR.
6. **Promote to `main`.** Open a PR `staging` → `main`. Reviewer required. CI runs the gate suite again. Merge → Vercel deploys to `layers.mirrorfactory.ai`. Tag the release (`v0.1.X`) on `main`.

**Hotfix path** (only when production is on fire):

```
hotfix/<issue> off main → PR straight to main + cherry-pick into staging + development
```

Reserve for actual incidents — broken auth, broken billing, leaking data. Anything else takes the long road.

## Vercel setup (one-time)

Open the Vercel project (`layers` under the `mirror-factory` team) → **Settings**.

### 1. Production branch
- **Settings → Git → Production Branch:** `main`
- **Production deployments:** only from `main`. Disable "Deploy on push" for any other branch claiming production.

### 2. Pin staging
- **Settings → Domains:** add `staging.layers.mirrorfactory.ai`.
- **Domains → assign branch:** `staging`. (This makes the staging domain track the `staging` branch's latest deploy.)
- **Settings → Environment Variables → Staging environment:** copy production env vars, then swap to staging-tier creds:
  - `NEXT_PUBLIC_APP_URL=https://staging.layers.mirrorfactory.ai`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` → staging Supabase project
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_CORE`, `STRIPE_PRICE_PRO` → Stripe test mode
  - `ASSEMBLYAI_API_KEY` → staging key (separate budget)
  - `AI_GATEWAY_*` → staging gateway slug
  - `RESEND_API_KEY` + `RESEND_FROM` → staging sender
  - `INNGEST_*` → staging Inngest env

### 3. Pin development
- Add `dev.layers.mirrorfactory.ai`, assign branch `development`.
- Same env-var pattern for the **Development** Vercel environment, with dev-tier creds (can share the staging Supabase project at first if you want fewer projects to manage).

### 4. Block search engines on non-prod
Add to `dev.layers.mirrorfactory.ai` and `staging.layers.mirrorfactory.ai` only — either via a `vercel.json` route header or middleware:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }]
    }
  ]
}
```

(Production stays indexable.)

## GitHub branch protection (one-time)

`gh repo edit` doesn't cover everything; do this in **Settings → Rules → Rulesets** (or **Settings → Branches** classic):

### Rule for `main`
- Restrict who can push: **disabled** (everyone goes through PR)
- Require a pull request: ✓
  - Required approvals: 1
  - Dismiss stale reviews on new commits
  - Require review from Code Owners (if you set CODEOWNERS)
- Require status checks to pass: ✓
  - Selected: `typecheck`, `unit-tests`, `e2e`, `smoke`, `gates` (whatever your CI exposes)
  - Require branches to be up to date before merging: ✓
- Require linear history: ✓ (forces fast-forward / squash, no merge commits)
- Block force pushes: ✓
- Restrict deletions: ✓
- **Bypass list: empty.** No `--no-verify`, no admin override.

### Rule for `staging`
- Same as `main` minus the linear-history requirement (you may want merge commits here for promotion).
- Required approvals: 1
- Required checks: typecheck, unit-tests, e2e
- Block force pushes: ✓

### Rule for `development`
- Require a PR: ✓
- Required approvals: 0–1 (your call — 0 lets you self-merge after CI is green)
- Required checks: typecheck, unit-tests
- Block force pushes: ✓

## Auth + webhook allow-lists

Each tier needs its own URLs registered upstream. Without these, OAuth bounces and Stripe webhooks 404.

### Supabase Auth → URL Configuration
- Site URL: production only — `https://layers.mirrorfactory.ai`
- Additional Redirect URLs (allow-list):
  - `https://layers.mirrorfactory.ai/auth/callback`
  - `https://staging.layers.mirrorfactory.ai/auth/callback`
  - `https://dev.layers.mirrorfactory.ai/auth/callback`
  - `https://*-mirror-factory.vercel.app/auth/callback` (per-PR previews)
  - `http://localhost:3000/auth/callback`

### Google OAuth (Cloud Console → Credentials → OAuth 2.0 Client)
- Authorised JavaScript origins: prod + staging + dev domains.
- Authorised redirect URIs: each domain + `/auth/callback`.

### Stripe (test mode for dev/staging, live for prod)
- Webhook endpoints, one per environment:
  - Live → `https://layers.mirrorfactory.ai/api/billing/webhook`
  - Test → `https://staging.layers.mirrorfactory.ai/api/billing/webhook`
  - Test → `https://dev.layers.mirrorfactory.ai/api/billing/webhook`
- Each endpoint has its own `STRIPE_WEBHOOK_SECRET` — set the right one per Vercel env.

## Documentation rule (this file)

> **Never push directly to `main`.**
>
> Every change reaches `main` via a PR from `staging`, which itself received the change via a PR from `development` (or a feature branch). The only exception is a tagged hotfix from a `hotfix/*` branch with explicit incident write-up linked in the PR.

Cross-reference this rule from `AGENTS.md` so agents enforce it too.

## Local script: switch tiers safely

Add to `package.json`:

```json
{
  "scripts": {
    "dev:staging": "vercel env pull --environment=preview --git-branch=staging .env.local && next dev",
    "dev:dev": "vercel env pull --environment=preview --git-branch=development .env.local && next dev"
  }
}
```

Then `pnpm dev:staging` boots the dev server pointed at staging-tier creds locally. Useful for repro'ing prod-shaped bugs without touching prod data.

## Migration checklist (when first turning this on)

- [ ] Create `staging` and `development` branches off current `main`.
- [ ] Vercel: set production branch to `main`, pin staging + dev domains.
- [ ] Vercel: copy env vars, swap creds for staging + dev.
- [ ] Add DNS records for `staging.` and `dev.` subdomains.
- [ ] Supabase: add staging + dev redirect URLs.
- [ ] Google OAuth: add staging + dev origins + redirects.
- [ ] Stripe: create staging + dev webhook endpoints (test mode).
- [ ] GitHub: enable branch protection rulesets on `main`, `staging`, `development`.
- [ ] Update `AGENTS.md` to reference this doc and the "no direct push to main" rule.
- [ ] Open a soak PR `development` → `staging` → `main` to prove the pipeline before retiring the direct-push habit.
- [ ] Close [PROD-383](https://linear.app/mirror-factory/issue/PROD-383).
