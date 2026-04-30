# Conventions

Operational rules for the Linear PM skill. Read alongside `lexicon.md`.

## Label Namespaces

Three reserved prefixes. The skill respects only these for rollups; other labels are user-defined and ignored.

### `theme:*` — workstreams (cross-project, no end date)

Recommended starter set (10 — generic to most apps):

| Label | Purpose |
|---|---|
| `theme:install` | Production setup, deploys, infra cutover |
| `theme:test` | Test suites, eval cases, regression coverage |
| `theme:onboard` | First-run UX, signup, walkthroughs |
| `theme:billing` | Stripe, credits, pricing, quotas |
| `theme:platform` | Auth, Supabase, Inngest, infra primitives |
| `theme:editor` | Core writing/recording surface |
| `theme:context` | Library, search, embeddings |
| `theme:integrations` | Connectors (Discord, Drive, Linear, Granola, Nango) |
| `theme:observability` | Logs, traces, costs, monitoring |
| `theme:landing` | Marketing site, public docs, pricing page |

Add or remove per-project. Each new theme should be **continuous** (no expected end date) and **cross-cutting** (touches multiple features). If a label has an end, it's an epic, not a theme.

### `kind:*` — issue kind (when not the default story)

| Label | Use when |
|---|---|
| `kind:epic` | Issue is a parent with sub-issues |
| `kind:bug` | Defect from intended behavior |
| `kind:spike` | Time-boxed investigation; output is a doc |

A regular story does **not** get a `kind:*` label.

### `owner:*` — who can do the work

| Label | Use when |
|---|---|
| `owner:human` | Requires product taste, design, customer comms, or external coordination |
| `owner:agent` | Has explicit AC, deterministic test plan, no UX judgment calls |

Every issue must have exactly one `owner:*` label before it leaves the backlog.

## Naming Rules

| Item | Rule | Example |
|---|---|---|
| Initiative | Outcome verb + measurable noun | "Layers — First 10 Users" |
| Project | Product or major surface name | "Layers", "Granger v2" |
| Milestone | Phase noun (no numbering) | "Foundation: Tests & Cost Defaults" |
| Story title | Action verb + outcome | "Add Deepgram runtime adapter" |
| Bug title | "Bug: <symptom>" | "Bug: streaming session drops on idle 60s" |
| Spike title | "Spike: <question>" | "Spike: pick storage path for 100MB+ uploads" |
| Label | `<namespace>:<lowercase-kebab>` | `theme:install`, `owner:agent` |

## Iron Laws

These are reproduced from `SKILL.md` for emphasis.

1. **Read before write.** Always run orient first.
2. **State IDs over names.** `list_issue_statuses({ team })` once; transition by ID.
3. **Filter every list.** Never call `list_issues` without `team` + `project`.
4. **Search before create.** `list_issues({ query: title })`. Surface top-3 candidates. Ask before creating duplicates.
5. **Cache the orient pass.** One orient call per session, reused.
6. **Confirm writes.** Reads autonomous. `save_*` operations require explicit confirmation, except trivial comments on issues the user named.
7. **Vertical slices only.** Every story touches end-to-end behavior.
8. **Owner-type required.** Every issue must have `owner:human` or `owner:agent` before it leaves the backlog.

## Agent-Readiness Checklist

An issue is ready for `owner:agent` only if all of these are true:

- [ ] Title is action-verb + outcome.
- [ ] Description states the problem in 1-3 sentences.
- [ ] Acceptance criteria are an explicit checkbox list (≥3 items).
- [ ] No items in AC require product judgment, customer comms, or design taste.
- [ ] Test plan is named: which file, which framework, which cases.
- [ ] Linked source-of-truth doc, design, or spec if the work touches user-facing surfaces.

If any are missing, the issue stays `owner:human` until a human fills them in.

## Status Update Rhythm

For active projects: post a status update at the end of every milestone, plus weekly while a milestone is in progress.

| Health | Use when |
|---|---|
| `onTrack` | Target date achievable, no open blockers |
| `atRisk` | Target date achievable only with intervention; ≥1 blocker or stale issue |
| `offTrack` | Target date no longer achievable; explicit re-plan needed |

Status update body should answer:
1. What shipped this period?
2. What's in flight?
3. What's blocked?
4. What's next?

## Decomposition Quality Gate

A decomposition is good when:

- Each child issue could ship independently.
- Each child issue is INVEST-compliant.
- Children are roughly equal-sized.
- The split reveals at least one low-value item that can be deferred or cut.

If none of those are true, the splitting pattern was wrong — try the next one in the order.
