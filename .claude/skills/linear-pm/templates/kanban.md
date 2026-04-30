# Kanban template

Status-grouped board for one project, milestone, or theme.

## Output shape

```
{scope.name} — Kanban
──────────────────────────────────────────────────────────────────────────────────
Backlog ({n})           Todo ({n})        In Progress ({n})  In Review ({n})  Done ({n})
──────────────────────────────────────────────────────────────────────────────────
{ID} {title}            {ID} {title}      {ID} {title}       {ID} {title}     {ID} {title}
{labels}                {labels}          {labels}           {labels}         {labels}
{owner} P{priority}     {owner} P{p}      {owner} P{p}       {owner} P{p}     {owner} P{p}
...
──────────────────────────────────────────────────────────────────────────────────
Canceled: {n}    (hidden by default; show with --include-canceled)
```

## Card content

Each card shows:

```
{identifier} {title}
  labels: {theme:*}, {kind:*}, {owner:*}
  P{priority} · {assignee or "—"} · due {dueDate or "—"}
```

Truncate long titles at 60 chars.

## Worked example (Layers, after bootstrap)

```
LAYERS — Kanban
──────────────────────────────────────────────────────────────────────────────────
Backlog (3)                       Todo (0)   In Progress (0)   In Review (0)   Done (1)
──────────────────────────────────────────────────────────────────────────────────
PROD-224 Supabase prod migration                                                PROD-127
  theme:install · theme:platform                                                  ARCHIVE
  P1 · alfonso · owner:human                                                     2026.1

PROD-225 Stripe production keys
  theme:billing · theme:install
  P2 · alfonso · owner:human

PROD-226 Inngest production setup
  theme:platform · theme:install
  P2 · alfonso · owner:agent
──────────────────────────────────────────────────────────────────────────────────
Canceled: 75 (PROD-168 + PROD-316 + 73 historical — hidden by default)
```

## Tooling

```
list_issue_statuses(team) → cache state IDs
list_issues(scope, paged 50)
group by status.id
order columns by Linear's state position
```

## Grouping options

| Group by | Columns become |
|---|---|
| `status` (default) | Backlog, Todo, In Progress, In Review, Done |
| `milestone` | One column per milestone in the project |
| `theme` | One column per `theme:*` label |
| `owner` | `owner:human`, `owner:agent`, `unassigned` |
| `priority` | Urgent, High, Medium, Low, None |
| `assignee` | One column per active user |

The user can request any of these and the skill will re-render. The Linear UI also supports all of them via Group By in the Board layout.
