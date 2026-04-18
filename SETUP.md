# Setup & deploy guide

Complete reference for bringing `audio-layer` online — local dev, Vercel production, and every API key the app consumes. Keep this file next to `README.md`; `VERIFICATION_GAPS.md` covers what's NOT yet verified end-to-end.

---

## The quickest real test (2 keys)

If you just want to record one meeting and prove the pipeline works end to end, you only need these two:

```bash
AI_GATEWAY_API_KEY=vck_...          # vercel.com/dashboard/ai-gateway
ASSEMBLYAI_API_KEY=...              # assemblyai.com (free $50 credit, no card)
```

Then:

```bash
pnpm install
cp .env.example .env.local         # paste the two keys above
pnpm dev
# open http://localhost:3000/record
# upload a short audio clip, get speaker-segmented transcript
# + summary + intake form in ~10-30 seconds
```

`/record/live` also works at this point (streaming with temp tokens). Meetings vanish on reload because there's no persistence, and there's no auth or billing — just the core pipeline.

---

## Complete env tiered by feature

### Tier 1 — LLM + transcription (required to test the app for real)

| Var | Where to get it | What breaks without it |
|---|---|---|
| `AI_GATEWAY_API_KEY` | [vercel.com → AI Gateway](https://vercel.com/dashboard) → create key | Summary + intake extraction fail; `/chat` 500s |
| `ASSEMBLYAI_API_KEY` | [assemblyai.com](https://www.assemblyai.com/app/account) → API key (free $50 credit) | `/record` and `/record/live` 500 on actual transcription |

Optional overrides (sensible defaults built in):

```bash
DEFAULT_MODEL=anthropic/claude-sonnet-4-6
ASSEMBLYAI_BATCH_MODEL=best          # Universal-3 Pro pre-recorded
ASSEMBLYAI_STREAMING_MODEL=u3-rt-pro # Universal-3 Pro streaming
```

### Tier 2 — Persistence + auth (add for real use)

| Var | Where to get it | What breaks without it |
|---|---|---|
| `SUPABASE_URL` | [supabase.com → new project → Settings → API](https://supabase.com/dashboard) | `/meetings` falls back to in-memory (lost on reload) |
| `SUPABASE_ANON_KEY` | same page, "anon public" key | same |
| `SUPABASE_SERVICE_ROLE_KEY` | same page, "service_role" key (secret) | Stripe webhook can't write profiles |
| `NEXT_PUBLIC_SUPABASE_URL` | **identical value to `SUPABASE_URL`** | `/sign-in` page can't talk to Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **identical value to `SUPABASE_ANON_KEY`** | same |

Plus 3 one-time clicks in the Supabase dashboard:

1. **SQL Editor** → paste `lib/supabase/schema.sql` → Run (creates `meetings` + `profiles` tables, RLS, triggers)
2. **Authentication → Providers** → enable **"Allow anonymous sign-ins"**
3. **Authentication → URL Configuration** → add callback URLs to the allow-list:
   - `http://localhost:3000/auth/callback` (local)
   - `https://<your-app>.vercel.app/auth/callback` (prod)

### Tier 3 — Billing (only if testing paywall + checkout)

| Var | Where to get it | What breaks without it |
|---|---|---|
| `STRIPE_SECRET_KEY` | [stripe.com → Developers → API keys](https://dashboard.stripe.com/test/apikeys) → Secret key (**use test mode**) | `/api/stripe/checkout` returns 503 (surfaced gracefully in UI) |
| `STRIPE_WEBHOOK_SECRET` | local: `stripe listen --forward-to localhost:3000/api/stripe/webhook`. prod: Webhooks → add endpoint → reveal signing secret | Webhook rejects every event |
| `STRIPE_PRICE_CORE` | Products → create "Core" recurring $15/mo → copy `price_...` id | Core subscribe button returns 503 |
| `STRIPE_PRICE_PRO` | Products → create "Pro" recurring $25/mo → copy `price_...` id | Pro subscribe button returns 503 |

Stripe webhook setup for **production**:
1. Stripe dashboard → Developers → Webhooks → **Add endpoint**
2. URL: `https://<your-app>.vercel.app/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel env

### Tier 4 — Observability (optional, free tier)

| Var | Where to get it | What breaks without it |
|---|---|---|
| `LANGFUSE_PUBLIC_KEY` | [cloud.langfuse.com](https://cloud.langfuse.com) → new project → Settings → API keys (free: 50k observations/mo) | No Langfuse traces; `/observability` still works from in-memory logs |
| `LANGFUSE_SECRET_KEY` | same | same |
| `LANGFUSE_BASE_URL` | `https://cloud.langfuse.com` (default) or self-hosted URL | — |

### App metadata

| Var | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; `https://<your-app>.vercel.app` in prod. Used by the Stripe Checkout success / cancel redirects |

---

## Deploying to Vercel

1. **Import the repo** — [vercel.com/new](https://vercel.com/new) → select `mirror-factory/audio-layer`. Vercel detects Next.js + pnpm automatically from `packageManager` in `package.json`.
2. **Add env vars** — copy every variable from the tiers above into the Project Settings → Environment Variables page. Tier 1 is the minimum.
3. **Deploy** — the first build runs `pnpm install` + `pnpm build`. All 21 routes should compile.
4. **One-time Supabase setup** — run steps from Tier 2 against your Supabase project.
5. **One-time Stripe setup** — run steps from Tier 3, making sure your webhook endpoint URL matches the deployed domain.

Known Vercel-specific caveat (tracked in `VERIFICATION_GAPS.md` #9): serverless function body limit is 4.5 MB. `/api/transcribe` accepts files up to 100 MB internally but larger uploads will 413 on Vercel. Fix is a client-direct-upload flow to Supabase Storage — future PR.

---

## What works with which subset of keys

| Keys provided | What works | What doesn't |
|---|---|---|
| None | Hub, all static pages, /meetings (in-memory), Markdown export renders if you seed data | Any real LLM or transcription |
| Tier 1 only | `/record` batch upload, `/record/live` streaming, /chat, summary + intake, PDF export | Persistence (lost on reload), sign-in, billing |
| Tier 1 + 2 | Everything above + `/meetings` persists across sessions, sign-in with magic link, per-user RLS isolation | Billing flow |
| Tier 1 + 2 + 3 | Full product: record → persist → paywall kicks in at 25 meetings → Stripe Checkout → subscription syncs back | — |
| Tier 1 + 2 + 3 + 4 | Above + Langfuse traces every LLM call | — |

---

## Known gaps before going live

See `VERIFICATION_GAPS.md` for the complete list. The ones you'll hit first:

- **Anonymous → email account merge is not implemented.** Users who record as anonymous and then sign in with email will have their old meetings become unreachable via RLS. Add a warning on /sign-in or wait until you implement `linkIdentity()`.
- **Vercel 4.5 MB body limit on uploads** — see above.
- **No eval harness for the summary / intake LLM calls.** Schemas are unit-tested but quality isn't. Run one manual recording against each realistic meeting type before letting users in.
- **Tauri Rust code never compiled.** Skip desktop for V1 launch; verify on a workstation with the Rust toolchain before announcing.
- **iOS / Android native projects don't exist.** Run `npx cap add ios` / `npx cap add android` on a machine with Xcode / Android SDK before shipping mobile.

---

## Quick reference — starting from zero

```bash
# 1. Clone
git clone https://github.com/mirror-factory/audio-layer
cd audio-layer

# 2. Install
pnpm install

# 3. Env
cp .env.example .env.local
# paste Tier 1 keys (minimum), then any other tiers you need

# 4. (Optional) Supabase schema
psql "$SUPABASE_DB_URL" -f lib/supabase/schema.sql
#   OR paste into Supabase SQL Editor

# 5. Run
pnpm dev
# open http://localhost:3000
```

Questions? Raise an issue on the repo or re-read the corresponding section in `README.md` / `AGENTS.md`.

---

## Desktop + mobile shells

**Desktop (Tauri 2.x):**

```bash
cargo install tauri-cli --version "^2.0"
cargo tauri dev     # runs `pnpm dev` in parallel + opens the native window
```

Bundle ID `com.mirrorfactory.audiolayer`. First `start_system_audio_capture` call prompts macOS for Screen Recording permission.

**Mobile (Capacitor — on a Mac with Xcode + Android Studio):**

```bash
bash mobile/setup.sh
npx cap open ios         # simulator or device
npx cap open android     # emulator or device
```

Sync patches run idempotently — re-running `setup.sh` after `npx cap sync` is safe.

**PWA:** no setup needed — Next.js serves `public/manifest.webmanifest` and users can "Add to Home Screen" from any device.
