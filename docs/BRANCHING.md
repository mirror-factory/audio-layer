# Branching & Promotion

How code flows from agent or human work into production. Lightweight by default; designed for many concurrent AI agents working from the same Linear board.

## The branches

| Branch | Purpose | Auto-deploys to | Who pushes here |
|---|---|---|---|
| **`main`** | Production | `https://layers.mirrorfactory.ai` | Promotion only — never direct |
| **`staging`** | Integration / preview | `https://staging.layers.mirrorfactory.ai` *(once Vercel domain is set)* | Reviewer merges feature PRs here |
| **`feature/<x>`** | Human feature branches | preview URL per push | Whoever's working on the feature |
| **`codex/PROD-XXX-<slug>`** | Codex Cloud Agent branches | preview URL per push | OpenAI Codex (cloud or local CLI) |
| **`claude/<slug>`** | Claude (this session / Linear PM skill) branches | preview URL per push | Claude via MCP |

## Flow

```
              Linear issue claimed
                      │
                      ▼
         ┌────────────────────────┐
         │   feature branch from  │
         │       `staging`        │
         │  (codex/, claude/, …)  │
         └────────────┬───────────┘
                      │ push commits
                      ▼
              ┌───────────────┐
              │  PR → staging │  ← reviewer (Claude / human)
              └───────┬───────┘
                      │ approve + merge
                      ▼
                 ┌─────────┐
                 │ staging │  → preview deploy, smoke test
                 └────┬────┘
                      │
                      │ promotion PR (daily / per-milestone)
                      ▼
                 ┌─────────┐
                 │  main   │  → production
                 └─────────┘
```

## Concrete rules

1. **Never push directly to `main`.** Production gets code only via a `staging → main` promotion PR.
2. **Never push directly to `staging`.** Feature branches → PR → review → merge.
3. **Branch *from* `staging`** when starting work, not from `main`. Keeps you current with everyone else's in-flight work.
4. **One branch per Linear issue.** Branch name format: `<agent>/<PROD-id>-<slug>`. Example: `codex/PROD-320-route-contracts`.
5. **PR title and body must reference the Linear issue ID** (e.g., `[PROD-320] Add route contract manifest`). Linear auto-links it.
6. **PRs target `staging`**, not `main`. The merge button on a PR to `main` should only be clicked during a promotion.

## Promotion cadence (`staging → main`)

The promotion PR is the only path to production. Run it:

- **Daily** during active milestone work (small batch, low risk).
- **Per-milestone** when a milestone reaches "done" status.
- **On demand** for hotfixes (fast-tracked).

Promotion PR requirements:

- [ ] All staged commits have green CI.
- [ ] Smoke test on `staging.layers.mirrorfactory.ai` passes (record a meeting, check sign-in, check checkout).
- [ ] No P0 / P1 Linear issues blocking.
- [ ] Reviewer (human) approves.
- [ ] Optional: `scripts/strict-mode.sh on && pnpm gates && scripts/strict-mode.sh off` before opening the promotion PR.

## Hotfix flow

For production-only fixes that can't wait for the staging cycle:

1. Branch from `main` directly: `hotfix/<short-desc>`.
2. Implement + test.
3. PR to `main` (skipping staging).
4. After merge, **also merge `main` back into `staging`** so they stay aligned.

Reserve hotfix flow for genuine production fires. Anything else goes through staging.

## Reviewing PRs

Default: **Claude reviews, human approves.** Claude (via the Linear PM skill + GitHub MCP) can:

- Read the diff (`pull_request_read`).
- Post review comments.
- Mark `approve` / `request changes`.
- Watch CI status.
- Surface red flags (security, missing tests, scope creep).

Claude **does not click merge** on either staging or main. The human merger is always the last gate.

## What this looks like for the active board

| Active issue | Status | Branch (when pushed) | PR target |
|---|---|---|---|
| PROD-320 (Codex Cloud) | In Progress | `codex/PROD-320-route-contracts` (sandbox-only so far) | `staging` |
| PROD-361 (Codex local) | In Review | `codex/PROD-361-legal-pages` (when pushed) | `staging` |
| PROD-368, 365, 364, 367, 362, 369, 371, 370 (Codex local) | In Progress / In Review | `codex/PROD-XXX-<slug>` | `staging` |

Once Codex pushes a branch + opens its PR, Claude picks it up for review automatically.

## Vercel deploy mapping

Set this up in Vercel project settings → Git → Production / Preview branches:

- **Production branch:** `main` → `https://layers.mirrorfactory.ai`
- **Preview branch (default):** `staging` → `https://staging.layers.mirrorfactory.ai` (set this domain alias)
- **Other preview branches:** `codex/*`, `claude/*`, `feature/*` → ephemeral preview URLs

That way every PR has a live preview URL, and merging to `staging` updates the integration environment automatically.

## Documenting in AGENTS.md

The skill `.claude/skills/linear-pm/conventions.md` references this doc as the source of truth. Any agent claiming a Linear issue must follow the rules above:

- Branch from `staging`.
- Commit on the agent-prefixed branch.
- Open PR targeting `staging`.
- Reference Linear ID in the PR.
- Wait for review.
- Never merge to `main`.
