# Project Audit template

Surface what's missing, stale, or misconfigured on a project. Use when the user asks "what's wrong with this project?" or before posting a status update.

## Output shape

```
PROJECT AUDIT — {project.name} ({team.key})
──────────────────────────────────────────────────────────────────────────────────
Generated: {now}
Initiative: {initiative.name or "✗ orphan project"}
Lead: {lead.name or "✗ unassigned"}
Target: {targetDate or "✗ not set"}  {overdue label if applicable}

Findings ({n} blocking, {m} warnings):
──────────────────────────────────────────────────────────────────────────────────
[BLOCKING]   {finding}
[WARNING]    {finding}
[INFO]       {finding}
──────────────────────────────────────────────────────────────────────────────────
Recommended actions: {numbered list}
```

## Audit checks

### Project-level

| Check | Severity if fails |
|---|---|
| Project has an initiative | BLOCKING |
| Project has a lead | WARNING |
| Project has a target date | WARNING |
| Target date is in the future OR project status is `complete` | BLOCKING |
| Project has at least one milestone | WARNING |
| Project has at least one document | INFO |
| Last status update is within 14d | WARNING |

### Milestone-level

| Check | Severity if fails |
|---|---|
| Each milestone has at least one issue | INFO |
| Each milestone has a target date | INFO |
| Each milestone progress matches issue completion (within 5%) | WARNING |

### Issue-level

| Check | Severity if fails |
|---|---|
| Every non-canceled issue has an `owner:*` label | WARNING |
| Every non-canceled issue has at least one `theme:*` label | WARNING |
| Every issue with sub-issues has `kind:epic` | INFO |
| No issue has been in `started` state for >30d | WARNING |
| No issue has zero AC checkboxes if title starts with story-shaped verb | INFO |

### Label-level

| Check | Severity if fails |
|---|---|
| All `theme:*` labels exist in the team | INFO |
| All `kind:*` labels exist in the team | INFO |
| All `owner:*` labels exist in the team | INFO |

## Worked example (Layers, before bootstrap)

```
PROJECT AUDIT — Layers (PROD)
──────────────────────────────────────────────────────────────────────────────────
Generated: 2026-04-30
Initiative: ✗ orphan project
Lead: alfonso
Target: 2026-03-31  [OVERDUE 30d]

Findings (3 blocking, 5 warnings):
──────────────────────────────────────────────────────────────────────────────────
[BLOCKING]  Project has no initiative
[BLOCKING]  Target date is in the past and status is not "complete"
[BLOCKING]  4 of 4 milestones are obsolete (Core Editor, Context Library, Multimodal, Ditto)
[WARNING]   Last project status update was 134 days ago
[WARNING]   Project has 0 documents
[WARNING]   5 of 5 backlog issues have no `theme:*` label
[WARNING]   5 of 5 backlog issues have no `owner:*` label
[INFO]      `theme:*`, `kind:*`, `owner:*` label sets do not exist in PROD team
──────────────────────────────────────────────────────────────────────────────────
Recommended actions:
1. Create initiative (e.g., "Layers — First 10 Users")
2. Attach Layers project to that initiative
3. Set new target date that reflects current scope
4. Archive obsolete milestones; create the new milestone set
5. Create label namespaces (`theme:*`, `kind:*`, `owner:*`) in PROD team
6. Tag the 4 active backlog issues with theme + owner
7. Seed at least one project document (Roadmap or PRD)
8. Post a project status update reflecting current health
```

## Tooling

```
get_project
list_milestones(project)
list_issues(project, paged 50)
list_issue_labels(team)
list_documents(project)
get_status_updates(project, type=initiative)
run all checks, render
```
