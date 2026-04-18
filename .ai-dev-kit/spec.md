---
# Mirror Factory Project Spec -- canonical format
# This file is the source of truth that the Planner agent expands into sprints.

spec_id: layer-one-audio
project: Layer One Audio
status: approved
owner: alfonsommorales13@gmail.com
version: 0.1
created_at: 2026-04-18
updated_at: 2026-04-18

goals:
  - Ship multi-platform meeting transcription with structured context extraction
  - Bot-free audio capture on macOS via ScreenCaptureKit
  - User-selectable LLM with transparent per-meeting cost

non_goals:
  - Video recording
  - CRM integration (v2)
  - Team workspaces (spec written, deferred)
  - Custom vocabulary training

metrics:
  leading: meetings transcribed per week (target 50+)
  lagging: free-to-paid conversion rate (target 5% at 90 days)

dependencies:
  apis: [assemblyai, langfuse, stripe, supabase, resend]
  required_secrets: [ASSEMBLYAI_API_KEY, AI_GATEWAY_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, RESEND_API_KEY]
  internal_services: []

milestones:
  - id: m0
    name: Spec approved
    due: 2026-04-18
  - id: m1
    name: Core pipeline working (transcribe + summarize + persist)
    due: 2026-04-17
  - id: m2
    name: Multi-platform (web + macOS + iOS)
    due: 2026-04-18
  - id: m3
    name: UI redesign + auth + billing
    due: 2026-04-19
  - id: m4
    name: Desktop intelligence (auto-detect meetings)
    due: null
  - id: m5
    name: Shared workspaces
    due: null

open_questions:
  - question: Custom domain (layerone.ai?)
    owner: Alfonso
    due: 2026-04-25
  - question: Windows Tauri build verification
    owner: CI
    due: 2026-04-22
---

# Layer One Audio

## TL;DR

Layer One Audio captures conversations passively (no meeting bot) and uses AI to extract structured, actionable data — not just summaries, but budgets, timelines, decision makers, requirements, and pain points. Ships as web, macOS desktop (Tauri), and iOS (Capacitor) from a single Next.js codebase. Users pick their own LLM and see per-meeting costs transparently.

## Problem & Users

**Who hurts:** Professionals who have conversations that matter — sales calls, client meetings, interviews, standups, strategy sessions. They need to capture what was said, understand what matters, and take action on it.

**What hurts:** Critical information gets lost because nobody can listen and take comprehensive notes simultaneously. 31 hours/month spent in meetings (Atlassian), 67% considered unproductive.

**How they solve it today:** Manual notes (incomplete), bot-based recorders like Otter/Fireflies (participants change behavior when they see a bot), or they just don't capture it and rely on memory.

**Cost of the current state:** Missed action items, forgotten budgets, lost deal context, repeated conversations. Estimated 15 min/meeting of post-meeting note consolidation that could be eliminated.

## Goals and Non-Goals

**Goals** (what success looks like in 90 days):

- 100+ meetings transcribed end-to-end with structured extraction
- <5s time-to-first-word on live transcription
- 5% free-to-paid conversion rate
- Multi-platform active users (web + macOS + iOS)

**Non-goals** (explicitly OUT of scope for v1):

- Video recording or screen capture
- CRM integration (HubSpot/Salesforce push)
- Team workspaces with shared meetings
- Custom vocabulary or model fine-tuning
- Android or Windows native apps (CI builds available, not actively developed)

## Success Metrics

| Metric | Kind | Target (90 day) | How we measure |
|--------|------|-----------------|----------------|
| Meetings transcribed/week | Leading | 50+ | Supabase meetings table count |
| Free-to-paid conversion | Lagging | 5% | Stripe subscription events / total signups |

## User Journeys

### Journey 1: First meeting capture

1. User opens Layer One (web/desktop/mobile)
2. Taps "Start Recording" — mic permission granted
3. Live transcript appears word-by-word as they speak
4. Taps "Stop" — AI generates summary + intake form in ~5 seconds
5. Meeting saved with title, key points, action items, decisions
6. User exports as PDF or Markdown

### Journey 2: Review past meetings

1. User opens app, sees recent meetings list on home screen
2. Taps a meeting → full transcript + summary + intake form
3. Queries the transcript: "What was the budget discussed?"
4. AI restructures the display with the answer
5. Shares meeting via link with a colleague

## Functional Requirements

- **FR-1** (Must): Live streaming transcription with speaker diarization via AssemblyAI
- **FR-2** (Must): AI summary + structured intake extraction via Vercel AI SDK generateObject
- **FR-3** (Must): Meeting persistence in Supabase with RLS per user
- **FR-4** (Must): User-selectable LLM model with transparent pricing in settings
- **FR-5** (Must): PDF and Markdown export
- **FR-6** (Must): Authentication (anonymous auto + email magic link + Google OAuth)
- **FR-7** (Must): Stripe billing (Free 25 meetings / Core $15 / Pro $25)
- **FR-8** (Should): macOS system audio capture via ScreenCaptureKit (bot-free)
- **FR-9** (Should): Meeting search and filtering
- **FR-10** (Should): Meeting detail chat (query transcripts with AI)
- **FR-11** (Could): Auto-detect meetings on macOS (watch for Zoom/Meet/Teams)
- **FR-12** (Could): Shared workspaces with folders and member invites
- **FR-13** (Won't): Video recording, CRM integration, custom vocabulary (v2)

## Scope & Milestones

**v0** (proof-of-concept, done):
- Batch transcription, AI summary, in-memory store

**v1** (shipped product, in progress):
- Live streaming, Supabase persistence, multi-platform (web + macOS + iOS), auth, billing, settings, export

**v2** (post-launch):
- Meeting detail chat, shared workspaces, desktop intelligence, Windows, Android

## Technical Architecture

**Stack:** Next.js 15 + React 19 + Tailwind v4 + TypeScript | Tauri 2.x (Rust) | Capacitor 8 | AssemblyAI | Vercel AI SDK v6 + AI Gateway | Supabase | Stripe | Langfuse | Resend

**Data model (core entities):**

- **Meeting**: id, user_id, status, title, text, utterances (jsonb), summary (jsonb), intake_form (jsonb), cost_breakdown (jsonb), duration_seconds, created_at
- **Profile**: user_id, stripe_customer_id, subscription_status, subscription_tier, current_period_end

**Critical flow (end-to-end):**

```
Mic → AssemblyAI WebSocket (u3-rt-pro) → Live transcript
  → User stops → POST /api/transcribe/stream/finalize
  → generateObject(summary) + generateObject(intake) in parallel
  → Upsert to Supabase meetings table
  → Redirect to /meetings/[id]
```

## Dependencies

| Vendor | Env keys | Used by | Where to get |
|--------|----------|---------|--------------|
| AssemblyAI | `ASSEMBLYAI_API_KEY` | Transcription (batch + streaming) | assemblyai.com/app/account |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` | LLM routing (summary + intake) | vercel.com/dashboard |
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Database + auth | supabase.com/dashboard |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Billing | dashboard.stripe.com |
| Langfuse | `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` | LLM observability | cloud.langfuse.com |
| Resend | `RESEND_API_KEY` | Transactional email | resend.com |

## Risks, Unknowns & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| AssemblyAI price increase | Medium | High | Architecture supports swapping to Deepgram via settings |
| Capacitor WebView performance on old devices | Medium | Medium | Optimize bundle size, lazy load routes |
| iOS call recording restrictions | High | Medium | Use device mic capture (Granola approach) |
| LLM summary quality inconsistency | Medium | Medium | Zod schema validation, multiple model options |

## Observability & Testing Strategy

**Logged on every request:** request_id, user_id, route, status, duration, model_id, token counts, cost

**Metrics exported:** LLM call cost, transcription duration, error rate, time-to-first-token

**Testing model:**

| Layer | What we run | Mocked or live | When |
|-------|-------------|----------------|------|
| Unit | `pnpm test` (106 tests) | Mocked vendors | Pre-commit |
| Compliance | `pnpm compliance` | Static analysis | Pre-push |
| E2E smoke | `pnpm test:smoke` | Playwright against dev | CI |
| API smoke | `pnpm test:api` | Built app | CI |
| Gates | `pnpm gates` | All of the above | Pre-push |

## Open Questions

- [ ] **Q1:** Custom domain (layerone.ai?) — owner: Alfonso, due: 2026-04-25
- [ ] **Q2:** Windows Tauri build verification — owner: CI, due: 2026-04-22
- [ ] **Q3:** Is structured intake extraction actually valued by users? — owner: Alfonso, due: 2026-05-01
- [ ] **Q4:** Pricing validation ($15/$25 vs competitors $14-$19) — owner: Alfonso, due: 2026-05-01

## Market & Competitive Landscape

**Adjacent products:** Granola ($14/mo, bot-free, Mac+Win+iOS), Otter ($17/mo, bot-based), Fireflies ($19/mo, bot+desktop), Fathom (free tier, bot-based)

**Why us:** Only product with structured CRM-ready extraction (not just summaries). User-selectable LLM with cost transparency. Multi-platform native from day one. Bot-free system audio capture on macOS.

---

_This spec was generated from project context and is maintained under `.ai-dev-kit/spec.md`. Mirror Factory spec format v1._
