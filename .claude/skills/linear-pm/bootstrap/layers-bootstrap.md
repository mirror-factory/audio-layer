# Bootstrap — Layers

Filled-in bootstrap for the Layers project. Source: `docs/LAUNCH_CHECKLIST.md` and `docs/V1_PLAN.md`.

## Inputs

- **Project name:** Layers
- **Team:** PROD (`c4c8df8d-3f78-4379-9c9f-52b3b51114fe`)
- **Project ID:** `572f1fa8-2473-4da9-bfd4-6d592d4ce061`
- **Initiative name:** Layers — First 10 Users
- **Initiative target date:** 2026-08-31
- **Initiative success metric:** 10 active trial users (free), day-7 retention ≥ 40%
- **Lead:** alfonso@mirrorfactory.com

## Theme set (Layers)

```
theme:install         theme:test           theme:onboard
theme:billing         theme:platform       theme:editor
theme:context         theme:integrations   theme:observability
theme:landing
```

## Milestone set (Layers, Option A — 6 milestones from V1 sprint plan)

| # | Name | Source | Approx duration |
|---|---|---|---|
| M1 | Foundation: Tests & Cost Defaults | V1 Sprints 0-2 | 2-3 weeks |
| M2 | MCP & Public API Hardening | V1 Sprint 3 | 1-2 weeks |
| M3 | Workflows: Chat, Search, Templates | V1 Sprint 4 | 2 weeks |
| M4 | Recording Reliability | V1 Sprint 5 | 1-2 weeks |
| M5 | Billing, Auth & Quotas | V1 Sprint 6 | 1-2 weeks |
| M6 | Native, Compliance & Launch | V1 Sprint 8 + Launch gates 4-6 | 2-3 weeks |

## Issue dispositions

| Issue | Action | Milestone | Labels |
|---|---|---|---|
| PROD-127 ARCHIVE 2026.1 | keep as-is (Done) | — | — |
| PROD-316 "test" | cancel (Vercel preview stub) | — | — |
| PROD-168 Ditto agent | cancel (out of scope per user) | — | — |
| PROD-224 Production Supabase migration | retag | M6 — Native, Compliance & Launch | `theme:install`, `theme:platform`, `owner:human` |
| PROD-225 Stripe production keys | retag | M5 — Billing, Auth & Quotas (cutover lands in M6) | `theme:billing`, `theme:install`, `owner:human` |
| PROD-226 Inngest production setup | retag | M6 — Native, Compliance & Launch | `theme:platform`, `theme:install`, `owner:agent` |

## Obsolete milestones to archive

| ID | Name | Reason |
|---|---|---|
| `186703dd-07f1-4e11-ad5c-abefa3b11e6c` | Core Editor | App rethought; old phase concept no longer relevant |
| `0d70955d-41c4-44c3-82da-472459ec89f4` | Context Library | Same |
| `d44e3c46-ecd0-4b6a-aded-25d82cfd23b3` | Multimodal Integration | Same |
| `ca66c32e-d15d-497c-8d79-2997dfcc949d` | Ditto Integration | Ditto removed from product scope |

## Initiative description

```markdown
# Layers — First 10 Users

**Goal:** 10 active trial users using Layers end-to-end (record → transcript → summary → actions) with day-7 retention ≥ 40%.

**Target:** 2026-08-31

**Success looks like:**
- Production env (Supabase + Stripe + Inngest) live and stable.
- Public-facing surfaces (landing, pricing, download, sign-in/sign-up) approved.
- Recording reliability proven: AssemblyAI batch + streaming work end-to-end.
- Billing flow exercised at least once with sandbox checkout.
- 10 trial accounts created; users actively recorded ≥ 1 meeting each.
- No P0/P1 bugs open.

**Out of scope (future initiative):**
- Paid conversion targets.
- Workspaces / team plans.
- Native packaging on all 4 platforms (web is sufficient for first 10).
- Ditto personal AI agent.

**Source of truth:** `docs/LAUNCH_CHECKLIST.md`, `docs/V1_PLAN.md`.
```

## Roadmap document content

```markdown
# Layers Roadmap

This document is the human-readable version of the Layers project structure in Linear. The skill `linear-pm` (lives at `.claude/skills/linear-pm/` in the audio-layer repo) maintains the labels, milestones, and rollups that this roadmap reflects.

## Initiative

**Layers — First 10 Users** · target 2026-08-31

10 trial users using Layers end-to-end with day-7 retention ≥ 40%.

## Milestones

### M1 — Foundation: Tests & Cost Defaults

Test architecture (API contract, MCP, AI tool registries, seed fixtures, mocked vendors), then move default models to the cheapest acceptable path. Source: V1 Plan sprints 0-2.

### M2 — MCP & Public API Hardening

Per-request auth context, API-key lifecycle, rate limits, MCP docs. The strategic wedge — Layers as the meeting-to-agent layer. Source: V1 Plan sprint 3.

### M3 — Workflows: Chat, Search, Templates

Meeting-detail chat, template picker (sales/interview/standup/custom), structured outputs, e2e tests, eval cases. Source: V1 Plan sprint 4.

### M4 — Recording Reliability

Storage-backed upload path for >Vercel-limit audio, AssemblyAI realtime token/session, autosave/finalize hardening, native permission tests. Source: V1 Plan sprint 5.

### M5 — Billing, Auth & Quotas

Stripe checkout/webhook/portal, subscription state machine, anonymous→email merge, magic-link sign-in, free/core/pro quota enforcement. Source: V1 Plan sprint 6.

### M6 — Native, Compliance & Launch

Production cutover (Supabase, Stripe, Inngest), legal pages (`/privacy`, `/terms`, deletion), App Store/Play Store assets, native packaging where in scope, full QA + evidence + launch tag. Source: Launch checklist gates 4-6 + launch-day.

## How to Use This in Linear

- **Project view → Group by Milestone:** kanban by phase.
- **Filter by `theme:*` label:** see one workstream across all milestones.
- **Filter by `owner:agent`:** see what an agent can pick up next.

## Conventions

- Every issue has one `theme:*` and one `owner:*` label before leaving the backlog.
- Bugs are labeled `kind:bug`. Spikes are labeled `kind:spike`. Stories are unlabeled (the default).
- State transitions go by ID, not name. Status updates are weekly during active milestones.

The full skill (lexicon, conventions, templates) lives in the `audio-layer` repo at `.claude/skills/linear-pm/`.
```

## Status update content

```markdown
**Reset and re-plan — 2026-04-30**

The Layers project has been reset on this date.

- Attached to new initiative **"Layers — First 10 Users"** (target 2026-08-31).
- Obsolete milestones (Core Editor, Context Library, Multimodal, Ditto) archived.
- Six new milestones created from the V1 Plan (sprints 0-8) and Launch Checklist (gates 4-6).
- 73 historical canceled issues left in place; Linear hides them by default.
- 3 active backlog issues (PROD-224 Supabase, PROD-225 Stripe, PROD-226 Inngest) retagged with theme + owner labels and routed to M5/M6.
- 2 out-of-scope issues canceled: PROD-168 (Ditto) and PROD-316 (Vercel preview stub).
- Label namespaces created: `theme:*` (10), `kind:*` (3), `owner:*` (2).

**Health: atRisk** — original target was 2026-03-31 (already passed). New target 2026-08-31 is ambitious; M1 (Foundation) needs to start immediately.

**This week:** populate M1 from `docs/V1_PLAN.md` Sprint 0 (route contract manifest, MCP test skeletons, AI tool registry tests, invariant suite).
```
