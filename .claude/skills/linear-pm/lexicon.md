# Lexicon

The 8-level PM hierarchy and the orthogonal axes that complete the model. Single source of truth — every other doc, template, and prompt references this.

## Hierarchy of Work (8 levels, biggest to smallest)

| Level | Standard term | Common synonyms | What it is | Lifespan | Linear primitive |
|---|---|---|---|---|---|
| 1 | **Vision / North Star** | Mission, Strategy | The "why" — multi-year intent | Years | Workspace document; named top-level Initiative |
| 2 | **Initiative** | Bet, Pillar, Objective (OKR) | A strategic push that spans multiple products/teams | Quarter–year | Native Initiative |
| 3 | **Theme** | Workstream, Stream, Track | A continuous, recurring concern (security, performance, onboarding, billing) — *no end date* | Ongoing | Label, prefix `theme:*` |
| 4 | **Epic** | Feature, Capability, Saga (SAFe) | A large user-visible outcome that decomposes into stories — *has an end* | Weeks–months | Project (large) · Milestone (medium) · Parent issue with sub-issues (small) |
| 5 | **Story** | User Story, Requirement | A single user-visible behavior, INVEST-sized | Days–~2 weeks | Issue (default; no label needed) |
| 6 | **Task** | Sub-task, Chore, Implementation | An engineering step under a story | Hours–days | Sub-issue (issue with `parentId`) |
| 7 | **Bug** | Defect, Issue, Incident | Deviation from intended behavior | Hours–days | Issue with label `kind:bug` |
| 8 | **Spike** | Investigation, Research Spike | Time-boxed exploration to reduce uncertainty | Hours–days | Issue with label `kind:spike` + due date |

## Orthogonal Axes

These don't fit the hierarchy — they apply across levels.

| Axis | Linear primitive | Convention | Why |
|---|---|---|---|
| **Theme** | Label | `theme:*` | Cross-project recurring concern; never ends |
| **Kind** | Label | `kind:epic`, `kind:bug`, `kind:spike` | Distinguishes leaf shape; story is default (no label) |
| **Owner-type** | Label | `owner:human`, `owner:agent` | Decides who can do the work |
| **Status** | Native State | column on the kanban; team-customizable | The kanban column |
| **Priority** | Native Priority | 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low | Ordering |

## Container Hierarchy in Linear

```
Workspace
  └── Initiative           ← strategic outcome, has target date and success metric
        └── Project        ← shippable thing
              └── Milestone ← phase inside a project (project view shows these as columns)
                    └── Issue       ← story or bug
                          └── Sub-issue  ← implementation task
```

One initiative → many projects (one-to-many, never the other way).
One project → many milestones, sequential phases.
One milestone → many issues.
One issue → many sub-issues (depth ≥ 1).

## Cycle vs Milestone

- **Cycle** = team-scoped sprint (time-boxed iteration, owned by team).
- **Milestone** = project-scoped phase (sequential, owned by project).

A single issue can have **both** a cycle (which sprint it ships in) and a milestone (which phase it belongs to). They're orthogonal.

## Labels Reserved for Skill Use

| Prefix | Purpose | Examples |
|---|---|---|
| `theme:*` | Cross-cutting workstream | `theme:install`, `theme:test`, `theme:billing` |
| `kind:*` | Issue kind that isn't the default story | `kind:epic`, `kind:bug`, `kind:spike` |
| `owner:*` | Who can do the work | `owner:human`, `owner:agent` |

Labels outside these namespaces are user-defined and ignored by the skill's rollups.
