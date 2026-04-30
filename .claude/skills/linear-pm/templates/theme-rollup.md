# Theme Rollup template

Cross-project rollup grouped by `theme:*` label. Use when you want to see one workstream's health across the whole workspace.

## Output shape

```
THEME ROLLUP — {team.key}                                 (cross-milestone, cross-project)
──────────────────────────────────────────────────────────────────────────────────
Theme              Total  Done  WIP  Backlog  %    Health   Top issue
──────────────────────────────────────────────────────────────────────────────────
{theme}            {n}    {d}   {w}  {b}      {p}%  {h}     {top.identifier} {top.title}
...
──────────────────────────────────────────────────────────────────────────────────
By owner: human={count} · agent={count} · unassigned={count}
```

## Columns

| Column | Source |
|---|---|
| Theme | Label name without `theme:` prefix |
| Total | Issues with this label, excluding canceled |
| Done | Issues with statusType `completed` |
| WIP | Issues with statusType `started` |
| Backlog | Issues with statusType `backlog` or `unstarted` |
| % | `done / total` |
| Health | Same rule as `epic-status-board.md` |
| Top issue | Highest-priority non-done issue in the theme |

## Worked example (Layers, after bootstrap)

```
THEME ROLLUP — PROD
──────────────────────────────────────────────────────────────────────────────────
Theme              Total  Done  WIP  Backlog  %     Health   Top issue
──────────────────────────────────────────────────────────────────────────────────
theme:install        3     0    0      3      0%   atRisk   PROD-224 Supabase prod
theme:platform       2     0    0      2      0%   atRisk   PROD-224 Supabase prod
theme:billing        1     0    0      1      0%   atRisk   PROD-225 Stripe prod
theme:test         156   156    0      0    100%   done     (archived in 2026.1)
theme:onboard        0     0    0      0      —    empty    —
theme:editor         0     0    0      0      —    empty    —
theme:context        0     0    0      0      —    empty    —
theme:integrations   0     0    0      0      —    empty    —
theme:observability  0     0    0      0      —    empty    —
theme:landing        0     0    0      0      —    empty    —
──────────────────────────────────────────────────────────────────────────────────
By owner: human=2 · agent=1 · unassigned=0
```

## Tooling

```
list_issue_labels(team) → filter to theme:* labels
for each label: list_issues(team, label, paged 50)
bucket by statusType
compute counts + health
render
```
