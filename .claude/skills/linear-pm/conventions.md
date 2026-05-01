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

### `agent:*` — which agent is currently on it (claim signal)

| Label | Use when |
|---|---|
| `agent:claude` | Claude (via Linear PM skill / MCP) is claiming or working on this issue |
| `agent:codex` | Codex (cloud or local CLI) is claiming or working on this issue |

When an agent picks up an issue, it **must add the matching `agent:*` label** in addition to transitioning state to `started`. When done or releasing, the label comes off (or stays as a record if the issue is `Done`).

This is a complement to the native `delegate` field, not a replacement. The label gives a visible at-a-glance signal in the kanban view ("oh, Claude has that one"). The delegate field is the authoritative claim.

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
9. **Status discipline.** When an agent begins work on an issue, transition it to `started` (In Progress) **before writing any code**. When done or abandoned, transition it forward (`completed`/`canceled`) or release it (back to `backlog`, clear delegate/assignee). Never leave a started issue stale.
10. **Multi-agent claim protocol.** Multiple agents (Claude, Codex, Cursor, the user, etc.) may share this Linear board. Before acting on an issue, every agent must check three signals — and skip the issue if any one says it's claimed.

## Multi-Agent Coordination

Multiple agents (Claude via this skill, Codex via `Codex for Linear`, Cursor, Notion AI, the user themselves) may all be reading and writing to the same Linear workspace. The skill operates under these rules to avoid stepping on other agents' work.

### The three claim signals

Before picking up an issue, check **all three** in order. If any one says it's claimed, skip and pick the next candidate.

| Signal | What says "claimed" | Tool |
|---|---|---|
| **State** | `statusType` is `started` (In Progress / In Review) | `get_issue` |
| **Delegate** | `delegate` is set to a non-null agent | `get_issue` |
| **Assignee** | `assignee` is set to another agent (Codex, Cursor, etc. — not a human) | `get_issue` |

A human assignee is **not** a claim against an agent — humans set themselves as assignee on virtually all issues to track ownership; that's compatible with delegating the work to an agent.

### Claiming an issue (this skill, when starting work)

1. `get_issue` — re-fetch right before claiming; another agent might have grabbed it since the last orient pass.
2. Check the three signals. If any says claimed, abort and pick another.
3. `save_issue` with:
   - `state: started` (use the team's `started` state ID, not "In Progress" by name)
   - `labels: [...existing, "agent:<self>"]` (e.g., `agent:claude`)
4. `save_comment` — post: `Starting work — <agent name> at <ISO timestamp>.`
5. Branch from `staging` using the convention `<agent>/<PROD-id>-<slug>` (see `docs/BRANCHING.md`).
6. Begin work.

### Releasing an issue

When done, blocked, or abandoning:

| Outcome | Transition | Comment |
|---|---|---|
| Finished, ready for review | `state: started` ("In Review" if the team has it) or `state: completed` | "Done — <next step or PR link>." |
| Blocked | `state: started` (stay), add a `blocked` label if the team uses one | "Blocked on <X>. Releasing claim. Pinging <person/agent>." Then clear the delegate. |
| Abandoning | back to `state: backlog` | "Abandoning — <reason>. Free for another agent to pick up." Then clear `delegate`/`assignee` if you set them. |

**Never silently drop an issue.** Always leave a comment explaining what happened.

### Coordination with Codex specifically

Codex (when delegated) **transitions state itself** when it picks up the cloud task — typically from `Backlog` to `In Progress`. The skill should:

- **Not pre-transition** an issue when delegating to Codex. Setting `delegate: Codex` is itself the claim. Let Codex update state.
- **Watch for Codex's "Started" comment** to confirm pickup; if it doesn't post within a few minutes, either the env isn't set up (see PROD-320 example) or the task is queued.
- **Treat any issue with `delegate: Codex` as locked**, regardless of state. Other agents (including the user's local Codex CLI sessions) must not touch it.

### Coordination with the user's own work

The user may directly edit issues in the Linear UI or work on them via Codex CLI / Cursor / Claude Code locally. To stay out of their way:

- If the user has assignee set to themselves AND no delegate, the work is human-led — agents should not act unless explicitly told.
- If the user is mid-conversation about an issue (saying "let me work on this"), the skill should not re-claim it.
- The user's intent in chat always trumps the heuristics above.

### Decision flow when picking the next issue

```
candidates = list_issues(project, state=backlog or todo)
for issue in candidates by priority:
  refresh = get_issue(issue.id)
  if refresh.statusType == 'started': skip
  if refresh.delegate is set: skip
  if refresh.assignee is an agent (not human): skip
  return issue
```

The `get_issue` re-check is critical — between `list_issues` returning a candidate and the moment we claim, another agent may have grabbed it. The atomic "check then write" is the closest we can get to a lock with Linear's API.

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
