# Epic Status Board template

Single-project rollup grouped by milestone (or parent issue, or `theme:*` label).

## Output shape

```
PROJECT: {project.name} ({team.key})  ·  target {project.targetDate}{overdue?}
Lead: {lead.name}  ·  Initiative: {initiative.name}

──────────────────────────────────────────────────────────────────────────────────────
Epic                       Owner    Target      Issues  Done  WIP  Block  %    Health   Δ7d
──────────────────────────────────────────────────────────────────────────────────────
{health-icon} {epic.name}  {owner}  {target}    {n}     {d}   {w}  {b}    {p}%  {h}     {delta}
...
──────────────────────────────────────────────────────────────────────────────────────
```

## Columns

| Column | Source |
|---|---|
| Health icon | 🟢 onTrack · 🟡 atRisk · 🔴 offTrack · ⚫ empty · ⚪ stalled · ✅ done |
| Epic | Milestone name (or parent issue title, or label name without prefix) |
| Owner | `lead.name` on milestone, or parent issue assignee, or project lead fallback |
| Target | `targetDate` if any |
| Issues | `count(child issues where state != canceled)` |
| Done | `count(child issues where statusType == completed)` |
| WIP | `count(child issues where statusType == started)` |
| Block | `count(child issues where label has 'blocked' OR overdue)` |
| % | Milestone: native `progress * 100`. Other: `done / (total - canceled)` |
| Health | See rule below |
| Δ7d | `count(child issues where completedAt > now - 7d)` |

## Health rule

```
✅ done       % == 100
⚫ empty      total == 0
⚪ stalled    no issue updated in 14d AND % < 100
🔴 offTrack   target < today AND % < 100
🟡 atRisk     (target < today + 7d AND % < 80) OR Block > 0
🟢 onTrack    otherwise
```

## Worked example (Layers, after bootstrap)

```
PROJECT: Layers (PROD)  ·  target 2026-08-31
Lead: alfonso  ·  Initiative: Layers — First 10 Users

──────────────────────────────────────────────────────────────────────────────────────
Epic                                       Owner    Target      Issues  Done  WIP  Block  %    Health   Δ7d
──────────────────────────────────────────────────────────────────────────────────────
⚫ M1 Foundation: Tests & Cost Defaults    alfonso  —              0     0    0    0     —    empty    +0
⚫ M2 MCP & Public API Hardening           alfonso  —              0     0    0    0     —    empty    +0
⚫ M3 Workflows: Chat, Search, Templates   alfonso  —              0     0    0    0     —    empty    +0
⚫ M4 Recording Reliability                alfonso  —              0     0    0    0     —    empty    +0
⚫ M5 Billing, Auth & Quotas               alfonso  —              0     0    0    0     —    empty    +0
🔴 M6 Native, Compliance & Launch         alfonso  2026-08-31     3     0    0    0     0%   offTrack +0
──────────────────────────────────────────────────────────────────────────────────────
By owner: human=2 · agent=1
```

## Tooling

```
list_milestones(project)
list_issues(project, paged 50, fields: id state stateType priority labels milestone updatedAt completedAt)
group by milestoneId
compute counts + health
render
```
