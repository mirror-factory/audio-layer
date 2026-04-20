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
  → checkQuota() reads profiles to determine if user bypasses free tier
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

- Free tier: 25 meetings lifetime (counted via Supabase RLS query)
- Active/trialing subscriptions bypass the limit entirely
- Enforced server-side in `POST /api/transcribe` and `POST /api/transcribe/stream/token`
- Returns HTTP 402 with `{ code: "free_limit_reached", upgradeUrl: "/pricing" }`
- **Fails open**: transient DB errors never lock users out

---

## 3. Cost Structure — What We Pay Per Meeting

### 3.1 Speech-to-Text (AssemblyAI)

**Batch transcription** (pre-recorded upload):

| Model | Base Rate | + Diarization | + Entity Detection | Total/hr |
|-------|-----------|---------------|-------------------|----------|
| **Universal-3 Pro** (default) | $0.21/hr | +$0.02/hr | +$0.08/hr | **$0.31/hr** |
| Slam-1 | $0.27/hr | +$0.02/hr | +$0.08/hr | $0.37/hr |
| Universal-2 | $0.15/hr | +$0.02/hr | +$0.08/hr | $0.25/hr |
| Nano | $0.12/hr | +$0.02/hr | +$0.08/hr | $0.22/hr |

**Streaming transcription** (real-time):

| Model | Rate/hr | + Diarization | Total/hr |
|-------|---------|---------------|----------|
| **u3-rt-pro** (default) | $0.45/hr | +$0.02/hr | **$0.47/hr** |
| u3-pro | $0.45/hr | +$0.02/hr | $0.47/hr |
| Universal Streaming | $0.15/hr | +$0.02/hr | $0.17/hr |
| Whisper RT | $0.15/hr | +$0.02/hr | $0.17/hr |

**Per-minute costs** (what matters for pricing):

| Model | Cost/min (batch) | Cost/min (streaming) |
|-------|-----------------|---------------------|
| Universal-3 Pro | $0.0052 | $0.0078 |
| Nano | $0.0037 | $0.0037 |
| Universal Streaming | — | $0.0028 |

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

**30-minute meeting, default models (U3-Pro batch + GPT-5.4 Nano):**

| Component | Cost |
|-----------|------|
| STT (batch, 30 min) | $0.155 |
| LLM (summary + intake) | $0.004 |
| **Total** | **$0.159** |

**30-minute meeting, streaming (u3-rt-pro + GPT-5.4 Nano):**

| Component | Cost |
|-----------|------|
| STT (streaming, 30 min) | $0.235 |
| LLM (summary + intake) | $0.004 |
| **Total** | **$0.239** |

---

## 4. Financial Analysis — Margin Per Tier

### Assumptions

- Average meeting: 30 minutes
- Default models: Universal-3 Pro (batch) / u3-rt-pro (streaming), GPT-5.4 Nano
- Mix: 60% streaming, 40% batch
- Blended cost per meeting: **$0.21**

### Per-User Economics

| Tier | Revenue/mo | Meetings/mo | Cost/mo | Gross Margin | Margin % |
|------|-----------|-------------|---------|-------------|----------|
| Free | $0 | 2 (avg) | $0.42 | -$0.42 | N/A |
| Core ($15) | $15 | 20 (est) | $4.20 | **$10.80** | **72%** |
| Core ($15) | $15 | 40 (heavy) | $8.40 | **$6.60** | **44%** |
| Pro ($25) | $25 | 20 (est) | $4.20 | **$20.80** | **83%** |
| Pro ($25) | $25 | 60 (heavy) | $12.60 | **$12.40** | **50%** |

### Break-Even Analysis

| Tier | Break-even meetings/mo | Break-even minutes/mo |
|------|----------------------|---------------------|
| Core ($15) | 71 meetings | 2,130 minutes (35.5 hrs) |
| Pro ($25) | 119 meetings | 3,570 minutes (59.5 hrs) |

A user would need to transcribe 35+ hours/month on Core to become unprofitable. That's extremely heavy usage.

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
| Tier prices | Stripe Dashboard → Products | Create new price, update env var |
| Free tier limit | `lib/billing/quota.ts` | Change `FREE_TIER_MEETING_LIMIT` |
| Default LLM model | `lib/settings-shared.ts` | Change `DEFAULTS.summaryModel` |
| Default STT model | `lib/settings-shared.ts` | Change `DEFAULTS.batchSpeechModel` |
| LLM pricing table | `lib/billing/llm-pricing.ts` | Update `COST_PER_M_TOKENS` |
| STT pricing table | `lib/billing/assemblyai-pricing.ts` | Update `BASE_RATES_PER_HOUR` |
| Add a new tier | Stripe + `lib/stripe/client.ts` | Add price ID mapping in `priceIdForTier` |
| Webhook events | `app/api/stripe/webhook/route.ts` | Add to `HANDLED_EVENTS` + `processEvent` |
| Cost display format | `lib/billing/llm-pricing.ts` | Edit `formatUsd()` |

---

## 7. Vendor Pricing Sources

| Vendor | Source | Last Verified |
|--------|--------|---------------|
| AssemblyAI | [assemblyai.com/pricing](https://www.assemblyai.com/pricing) | 2026-04-18 |
| OpenAI (GPT-4.1/5.4) | [platform.openai.com/pricing](https://platform.openai.com/pricing) | 2026-04-18 |
| Anthropic (Claude) | [anthropic.com/pricing](https://anthropic.com/pricing) | 2026-04-18 |
| Google (Gemini) | [ai.google.dev/pricing](https://ai.google.dev/pricing) | 2026-04-18 |
| Vercel AI Gateway | Zero markup — passes through vendor prices | Confirmed 2026-04-18 |
| Stripe | 2.9% + $0.30 per transaction | Standard |

### Stripe Fee Impact on Margins

| Tier | Revenue | Stripe Fee | Net Revenue | Our Cost (20 mtgs) | True Margin |
|------|---------|-----------|-------------|--------------------|-----------| 
| Core | $15.00 | $0.74 | $14.26 | $4.20 | **$10.06 (67%)** |
| Pro | $25.00 | $1.03 | $23.97 | $4.20 | **$19.77 (79%)** |
