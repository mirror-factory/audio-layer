# Layer One Audio — Pricing, Billing & Financial Analysis

**Owner:** Billing/Operations team
**Last updated:** 2026-04-20
**Status:** Live (Stripe test mode)

---

## 1. Stripe Setup

### Current Configuration

| Setting | Value |
|---------|-------|
| Mode | **Test mode** (switch to live in Stripe dashboard) |
| API version | `2025-04-30.basil` (stripe npm `^22.0.2`) |
| Checkout flow | Stripe-hosted Checkout Session (redirect) |
| Webhook endpoint | `POST /api/stripe/webhook` |
| Webhook events | `checkout.session.completed`, `customer.subscription.created/updated/deleted` |

### Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `STRIPE_SECRET_KEY` | `.env.local` + Vercel | API authentication |
| `STRIPE_WEBHOOK_SECRET` | `.env.local` + Vercel | Webhook signature verification |
| `STRIPE_PRICE_CORE` | `.env.local` + Vercel | Price ID for Core tier ($15/mo) |
| `STRIPE_PRICE_PRO` | `.env.local` + Vercel | Price ID for Pro tier ($25/mo) |

### How to Change Prices

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Edit or create a new price under the product
3. Copy the new `price_...` ID
4. Update `STRIPE_PRICE_CORE` or `STRIPE_PRICE_PRO` in env vars
5. Redeploy

### How the Flow Works

```
User clicks "Subscribe" on /pricing
  → POST /api/stripe/checkout { tier: "core" | "pro" }
  → Server creates/reuses Stripe customer (stored in profiles table)
  → Server creates Checkout Session with the price ID
  → Returns checkout URL → user redirected to Stripe-hosted page
  → User pays → Stripe calls POST /api/stripe/webhook
  → Webhook syncs subscription_status + subscription_tier to profiles table
  → checkQuota() reads profiles + active admin pricing config for limits
```

### Profiles Table (Supabase)

| Column | Purpose |
|--------|---------|
| `user_id` | Links to Supabase auth user |
| `stripe_customer_id` | Stripe customer (created once, reused) |
| `subscription_status` | `active`, `trialing`, `past_due`, `canceled`, `null` |
| `subscription_tier` | `core`, `pro`, `null` |
| `current_period_end` | When to show renewal date |

### Going Live

1. Toggle Stripe to **live mode** in dashboard
2. Create live products + prices (same structure as test)
3. Set live `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_CORE`, `STRIPE_PRICE_PRO` in Vercel env vars
4. Add production webhook endpoint: `https://audio-layer.vercel.app/api/stripe/webhook`
5. Verify webhook receives events

---

## 2. Pricing Tiers

| Tier | Price | Meetings | Features |
|------|-------|----------|----------|
| **Free** | $0 | 25 lifetime | Batch + live transcription, AI summary + intake, cost transparency |
| **Core** | $15/month | Unlimited | All Free features + priority processing + full model selection |
| **Pro** | $25/month | Unlimited | All Core features + priority support + future premium features |

### Quota Enforcement

- Quotas are read from the active version in `/admin/pricing`.
- Free default: 25 meetings lifetime plus a 120 minute monthly cap.
- Core default: 600 minutes/month.
- Pro default: 1,500 minutes/month.
- Active/trialing subscriptions use `profiles.subscription_tier` to select the
  active plan limits.
- Enforced server-side in `POST /api/transcribe` and
  `POST /api/transcribe/stream/token`.
- Returns HTTP 402 with `{ code: "free_limit_reached", upgradeUrl: "/pricing" }`
  for backward-compatible clients; the message specifies the active plan limit.
- **Fails open**: transient DB errors never lock users out.

### Dynamic Pricing Config

`/admin/pricing` saves drafts and active versions through:

| Route | Purpose |
|-------|---------|
| `GET /api/admin/pricing` | Load active config and recent versions |
| `PUT /api/admin/pricing` | Save a draft scenario |
| `POST /api/admin/pricing/activate` | Promote a draft to active |

Supabase production persistence lives in `pricing_config_versions`. Local
development falls back to `.ai-dev-kit/pricing-config.json`.

---

## 3. Cost Structure — What We Pay Per Meeting

### 3.1 Speech-to-Text (AssemblyAI)

**Batch transcription** (pre-recorded upload):

| Model | Base Rate | + Diarization | + Entity Detection | Total/hr |
|-------|-----------|---------------|-------------------|----------|
| Universal-3 Pro | $0.21/hr | +$0.02/hr | +$0.08/hr | $0.31/hr |
| Slam-1 | $0.27/hr | +$0.02/hr | +$0.08/hr | $0.37/hr |
| **Universal-2** (default) | $0.15/hr | +$0.02/hr | +$0.08/hr | **$0.25/hr** |
| Nano | $0.12/hr | +$0.02/hr | +$0.08/hr | $0.22/hr |

**Streaming transcription** (real-time):

| Model | Rate/hr | + Diarization | Total/hr |
|-------|---------|---------------|----------|
| u3-rt-pro | $0.45/hr | +$0.12/hr | $0.57/hr |
| u3-pro | $0.45/hr | +$0.12/hr | $0.57/hr |
| **Universal Streaming Multilingual** (default) | **$0.15/hr** | Optional +$0.12/hr | **$0.15/hr base** |
| Whisper RT | $0.30/hr | +$0.12/hr | $0.42/hr |

**Per-minute costs** (what matters for pricing):

| Model | Cost/min (batch) | Cost/min (streaming) |
|-------|-----------------|---------------------|
| Universal-3 Pro | $0.0052 | $0.0078 |
| Nano | $0.0037 | $0.0037 |
| Universal Streaming Multilingual | — | $0.0025 base |

### 3.2 LLM Summarization (via Vercel AI Gateway)

Each completed meeting runs 2 LLM calls: `summarizeMeeting()` + `extractIntakeForm()`.

**Token usage per meeting** (typical 30-min meeting, ~4000 input tokens, ~800 output tokens per call, 2 calls):

| Model | Input $/1M | Output $/1M | Cost/meeting (2 calls) | Cost/month (40 meetings) |
|-------|-----------|------------|----------------------|------------------------|
| **GPT-5.4 Nano** (default) | $0.20 | $1.25 | **$0.004** | **$0.16** |
| GPT-4.1 Mini | $0.40 | $1.60 | $0.006 | $0.24 |
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.012 | $0.48 |
| Gemini 2.0 Flash | $0.10 | $0.40 | $0.002 | $0.09 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $0.036 | $1.44 |
| Claude Opus 4.7 | $5.00 | $25.00 | $0.060 | $2.40 |

### 3.3 Total Cost Per Meeting

**30-minute meeting, default models (Universal-2 batch + GPT-5.4 Nano):**

| Component | Cost |
|-----------|------|
| STT (batch, 30 min) | $0.125 |
| LLM (summary + intake) | $0.004 |
| **Total** | **$0.129** |

**30-minute meeting, streaming (Universal Streaming + GPT-5.4 Nano):**

| Component | Cost |
|-----------|------|
| STT (streaming, 30 min) | $0.075 |
| LLM (summary + intake) | $0.004 |
| **Total** | **$0.079** |

---

## 4. Financial Analysis — Margin Per Tier

### Assumptions

- Average meeting: 30 minutes
- Default models: Universal-2 (batch) / Universal Streaming Multilingual base streaming, GPT-5.4 Nano
- Mix: 60% streaming, 40% batch
- Blended cost per meeting: **$0.10**

### Per-User Economics

| Tier | Revenue/mo | Meetings/mo | Cost/mo | Gross Margin | Margin % |
|------|-----------|-------------|---------|-------------|----------|
| Free | $0 | 2 (avg) | $0.20 | -$0.20 | N/A |
| Core ($15) | $15 | 20 (est) | $1.98 | **$13.02** | **87%** |
| Core ($15) | $15 | 40 (heavy) | $3.96 | **$11.04** | **74%** |
| Pro ($25) | $25 | 20 (est) | $1.98 | **$23.02** | **92%** |
| Pro ($25) | $25 | 60 (heavy) | $5.94 | **$19.06** | **76%** |

### Break-Even Analysis

| Tier | Break-even meetings/mo | Break-even minutes/mo |
|------|----------------------|---------------------|
| Core ($15) | 151 meetings | 4,545 minutes (76 hrs) |
| Pro ($25) | 252 meetings | 7,575 minutes (126 hrs) |

A user would need to transcribe roughly 76+ hours/month on Core to become unprofitable under the base live-cost model. That's extremely heavy usage for the target customer.

### 1,000-Customer Scenario

The admin simulator now includes a portfolio model. With the default plan mix
of 250 Free, 650 Core, and 100 Pro accounts, the product clears $10k MRR:

| Scenario | Customers | Paid users | MRR | ARR |
|----------|-----------|------------|-----|-----|
| Mixed default | 1,000 | 750 | $12,250 | $147,000 |
| All Core | 1,000 | 1,000 | $15,000 | $180,000 |

This is why the $15 Core plan can work, but only if free usage is capped and
paid usage is modeled in minutes rather than vague "unlimited" language.

### If User Picks Expensive Models

Worst case: Claude Opus 4.7 for summaries + u3-rt-pro streaming:

| Component | Cost/30min meeting |
|-----------|-------------------|
| STT (streaming) | $0.235 |
| LLM (Opus 4.7, 2 calls) | $0.060 |
| **Total** | **$0.295** |

| Tier | Revenue | 40 meetings/mo | Margin |
|------|---------|----------------|--------|
| Core | $15 | $11.80 | $3.20 (21%) |
| Pro | $25 | $11.80 | $13.20 (53%) |

Still profitable even with the most expensive models at 40 meetings/month.

---

## 5. Minutes-Based Pricing Consideration

The current model is **meetings-based** (25 free, unlimited paid). An alternative is **minutes-based**:

### Option A: Minutes-based tiers

| Tier | Price | Minutes/mo | Overage |
|------|-------|-----------|---------|
| Free | $0 | 60 min | Blocked |
| Core | $15 | 600 min (10 hrs) | $0.02/min |
| Pro | $25 | 1500 min (25 hrs) | $0.015/min |

**Pros:** Fairer — a 5-min standup costs less than a 2-hr strategy session. Prevents abuse. Aligns cost with value.

**Cons:** Harder to communicate. Users worry about "running out." Competitors use meeting counts.

### Option B: Hybrid (current + soft minutes cap)

Keep meetings-based tiers but add a minutes soft cap. Over the cap, meetings still work but quality drops (use cheaper models automatically).

### Implementation for Minutes-Based

Would require:
1. Track `duration_seconds` per meeting (already stored)
2. Sum monthly minutes in `checkQuota()`
3. Add `minutes_used` / `minutes_limit` to profiles or compute from meetings table
4. Update pricing page UI to show minutes
5. Update `/usage` page to show minutes consumed

The data infrastructure already exists — `meetings.duration_seconds` is persisted for every meeting. The change is in the quota logic and UI, not the schema.

---

## 6. How to Change Anything

| What | Where | How |
|------|-------|-----|
| Pricing/margin scenario | `/admin/pricing` | Adjust model inputs, save draft, activate when approved |
| Tier prices | Stripe Dashboard → Products | Create new price, update env var |
| Plan meeting/minute limits | `/admin/pricing` | Edit quota minutes and meeting caps, then activate the version |
| Default LLM model | `lib/settings-shared.ts` | Change `DEFAULTS.summaryModel` |
| Default STT model | `lib/settings-shared.ts` | Change `DEFAULTS.batchSpeechModel` |
| LLM pricing source of truth | `lib/billing/llm-pricing.ts` | Update `LLM_PRICING_OPTIONS`; `COST_PER_M_TOKENS` is derived |
| STT pricing source of truth | `lib/billing/stt-pricing.ts` | Update `STT_PRICING_OPTIONS`; admin dashboard and settings read this catalog |
| AssemblyAI runtime estimator | `lib/billing/assemblyai-pricing.ts` | Keep AssemblyAI runtime cost aliases in sync with the catalog |
| Add a new tier | Stripe + `lib/stripe/client.ts` | Add price ID mapping in `priceIdForTier` |
| Webhook events | `app/api/stripe/webhook/route.ts` | Add to `HANDLED_EVENTS` + `processEvent` |
| Cost display format | `lib/billing/llm-pricing.ts` | Edit `formatUsd()` |

### 6.1 Provider Alternatives

`lib/billing/stt-pricing.ts` now normalizes STT alternatives to hourly rates
so admin can compare plan margins without rewriting the app:

| Provider | Use when | Notes |
|----------|----------|-------|
| AssemblyAI | Default live/batch path | Good API coverage; Universal Streaming Multilingual is the current base live default at $0.15/hr, with diarization optional. |
| Soniox | Lowest-cost realtime candidate | Public token-equivalent pricing is about $0.12/hr realtime and $0.10/hr async; needs an adapter and meeting benchmark. |
| Deepgram | Realtime latency fallback | Nova-3 pay-as-you-go is $0.0077/min ($0.462/hr) before speaker diarization. Diarization adds $0.002/min ($0.12/hr), so a meeting-notes default is closer to $0.582/hr. |
| Gladia | Bundled diarization/language detection | Growth realtime starts at $0.25/hr with commitment; Starter realtime is $0.75/hr. |
| Speechmatics | Accuracy/latency benchmark candidate | Public Pro pricing starts from $0.24/hr; Pipecat summary reports strong pooled semantic WER. |
| ElevenLabs | Quality benchmark candidate | Scribe v2 is $0.22/hr batch and Scribe v2 Realtime is $0.39/hr. |
| Rev AI | Low-cost English batch candidate | Reverb Turbo is $0.10/hr; Reverb is $0.20/hr. |
| OpenAI | Batch fallback without diarization | GPT-4o mini transcribe is $0.003/min ($0.18/hr). |
| Google Cloud | Cheap dynamic batch fallback | V2 dynamic batch is $0.003/min ($0.18/hr). |
| AWS Transcribe | Enterprise/compliance fallback | Tier-1 standard is $0.024/min ($1.44/hr). |

---

## 7. Vendor Pricing Sources

| Vendor | Source | Last Verified |
|--------|--------|---------------|
| AssemblyAI | [assemblyai.com/pricing](https://www.assemblyai.com/pricing) | 2026-04-27 |
| Deepgram | [deepgram.com/pricing](https://deepgram.com/pricing) | 2026-04-26 |
| Gladia | [support.gladia.io pricing article](https://support.gladia.io/article/understanding-our-transcription-pricing-pv1atikh8y9c8sw7sudm3rcy) | 2026-04-26 |
| Speechmatics | [speechmatics.com/pricing](https://www.speechmatics.com/pricing) | 2026-04-26 |
| Soniox | [soniox.com/pricing](https://soniox.com/pricing) | 2026-04-26 |
| ElevenLabs | [elevenlabs.io/pricing/api](https://elevenlabs.io/pricing/api) | 2026-04-26 |
| Rev AI | [rev.ai/pricing](https://www.rev.ai/pricing) | 2026-04-26 |
| OpenAI | [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing) | 2026-04-26 |
| Anthropic | [platform.claude.com pricing](https://platform.claude.com/docs/en/about-claude/pricing) | 2026-04-26 |
| Google (Gemini + STT) | [ai.google.dev pricing](https://ai.google.dev/gemini-api/docs/pricing), [Cloud STT pricing](https://cloud.google.com/speech-to-text/pricing) | 2026-04-26 |
| AWS Transcribe | [aws.amazon.com/transcribe/pricing](https://aws.amazon.com/transcribe/pricing/) | 2026-04-26 |
| Vercel AI Gateway | Zero markup — passes through vendor prices | Confirmed 2026-04-18 |
| Stripe | 2.9% + $0.30 per transaction | Standard |

### Stripe Fee Impact on Margins

| Tier | Revenue | Stripe Fee | Net Revenue | Our Cost (20 mtgs) | True Margin |
|------|---------|-----------|-------------|--------------------|-----------| 
| Core | $15.00 | $0.74 | $14.26 | $4.20 | **$10.06 (67%)** |
| Pro | $25.00 | $1.03 | $23.97 | $4.20 | **$19.77 (79%)** |
