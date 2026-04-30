# Triage template

Surface untagged or unowned issues. For each, propose theme + kind + owner + priority. Surface near-duplicates. Batch the writes after user approval.

## Output shape

```
TRIAGE — {team.key}                                           {n} issues need attention
──────────────────────────────────────────────────────────────────────────────────
{ID}  {title}                                                {created}
  current:    theme={list or "—"}  kind={list or "—"}  owner={list or "—"}  P{p}
  proposed:   theme={list}         kind={list}         owner={list}         P{p}
  reason:     {one-line rationale}
  duplicates: {top-3 nearest issues by title or "none"}
  → Approve · Edit · Reject · Skip
──────────────────────────────────────────────────────────────────────────────────
...
```

## Selection criteria

An issue lands in triage if any of these are true:

- No `theme:*` label.
- No `owner:*` label.
- Priority is unset (P0 / "No priority").
- Title or description is shorter than 10 chars.
- It's a comment-imported stub (e.g., from Vercel preview).

## Proposal logic

For each triage candidate:

1. **Theme**: scan title + description for theme keywords. Match against label registry. Propose 1-2.
2. **Kind**: if title starts with "Bug:" → `kind:bug`. If "Spike:" → `kind:spike`. If has sub-issues → `kind:epic`. Else default story (no label).
3. **Owner**: if AC has ≥3 checkboxes AND no UX-judgment language → `owner:agent`. Else `owner:human`.
4. **Priority**: if security or data integrity → P1. If launch-blocking → P2. If polish → P3. Else P4.
5. **Duplicates**: `list_issues({ team, query: title.first40chars })`. Show top-3 by title similarity.

## Worked example

```
TRIAGE — PROD                                              1 issue needs attention
──────────────────────────────────────────────────────────────────────────────────
PROD-316  test                                                created 2026-04-29
  current:    theme=—  kind=—  owner=—  P0
  proposed:   ARCHIVE — Vercel preview stub with no AC, 1-word title
  reason:     Title is "test", description is auto-generated thread comment.
  duplicates: none
  → Approve archive · Edit · Reject · Skip
──────────────────────────────────────────────────────────────────────────────────
```

## Tooling

```
list_issues(team, paged 50)
filter to triage candidates
for each:
  list_issues(team, query=title.first40chars, limit=3)  → duplicates
  compute proposal
emit table
wait for approval per row
batch save_issue
```
