# Tree template

Indented Initiative → Project → Milestone → Issue → Sub-issue view. Use when the user wants to see decomposition depth, not just status counts.

## Output shape

```
{health-icon} {initiative.name}                                  target {date}
└── {project.name}                                                target {date}
    ├── {health-icon} {milestone.name}  ({n} issues, {p}% done, {h})
    │   ├── {health-icon} {ID}  {title}                P{p}  {state}  {assignee}  due —
    │   │   ├── ☐ {ac.line.1}
    │   │   ├── ☐ {ac.line.2}
    │   │   └── ☐ {ac.line.3}
    │   └── ...
    └── ...
```

## Conventions

- Health icon at every level (initiative, milestone, issue).
- Sub-issues render as nested issue rows under their parent.
- Acceptance-criteria checkboxes are parsed from the issue description's `- [ ]` and `- [x]` lines.
- AC checkboxes appear under stories/epics, not under bugs or spikes.

## Worked example (Layers, after bootstrap)

```
🔴 Layers — First 10 Users                                        target 2026-08-31
└── Layers (PROD)                                                  target 2026-08-31
    ├── ⚫ M1 Foundation: Tests & Cost Defaults  (0 issues, —, empty)
    ├── ⚫ M2 MCP & Public API Hardening         (0 issues, —, empty)
    ├── ⚫ M3 Workflows: Chat, Search, Templates  (0 issues, —, empty)
    ├── ⚫ M4 Recording Reliability               (0 issues, —, empty)
    ├── ⚫ M5 Billing, Auth & Quotas              (0 issues, —, empty)
    └── 🔴 M6 Native, Compliance & Launch        (3 issues, 0%, offTrack)
        ├── 🔴 PROD-224  Production Supabase migration              P1  Backlog  alfonso  due —
        │   ├── ☐ Apply 18 migrations to hosted project
        │   ├── ☐ Verify pgvector + HNSW indexes
        │   ├── ☐ Confirm RLS policies active
        │   └── ☐ Test all RPC functions
        ├── 🟡 PROD-225  Stripe production keys                     P2  Backlog  alfonso  due —
        └── 🟡 PROD-226  Inngest production setup                   P2  Backlog  alfonso  due —
```

## Tooling

```
get_initiative
list_projects(initiative)
list_milestones(project)
list_issues(project, paged 50)
parse description for AC checkboxes
build tree, render
```
