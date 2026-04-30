# Linear PM Skill

> Read-first Linear project management with an 8-level PM hierarchy, kanban-style rollups, INVEST-based epic decomposition, and a clear human/agent ownership model.

## When to Use

Invoke this skill when the user asks to:

- Plan a sprint, triage a backlog, or audit a project.
- Decompose an epic, parent issue, or feature spec into stories and tasks.
- Render a kanban view, theme rollup, or epic status board.
- Bootstrap a new project (create initiative, milestones, labels, seed docs).
- Decide whether work should be owned by a human or an agent.
- Reconcile a Linear project with a source-of-truth doc (e.g., `docs/LAUNCH_CHECKLIST.md`).

Skip this skill for: pure code refactoring, debugging business logic, single-file edits.

## Reference Files

- `lexicon.md` — the 8-level PM hierarchy and the orthogonal axes (theme, kind, owner, status, priority).
- `conventions.md` — label namespaces, naming rules, and the iron laws.
- `templates/` — copy-paste shapes for rollups, kanban, tree, triage, decomposition, audits.
- `bootstrap/` — per-project setup scripts (start with `_template.md`, then create one per project).

Read `lexicon.md` and `conventions.md` before any write operation.

## Required Tools

The skill uses the Linear MCP server. Required tool names (loaded on demand):

- `list_teams`, `get_team`, `list_users`
- `list_initiatives`, `get_initiative`, `save_initiative`
- `list_projects`, `get_project`, `save_project`
- `list_milestones`, `save_milestone`
- `list_issues`, `get_issue`, `save_issue`
- `list_issue_statuses`, `list_issue_labels`, `create_issue_label`
- `list_documents`, `save_document`
- `save_status_update`, `get_status_updates`
- `list_comments`, `save_comment`
- `list_cycles`

If the Linear MCP is not loaded, stop and ask the user to enable it.

## Five Core Workflows

### 1. orient(scope)

Read-only context build. Always run this before any write. Cache results for the session.

```
list_teams
list_projects(team)
list_milestones(project)
list_issue_statuses(team)
list_issue_labels(team)
list_users
```

Cache shape: `{teamId → statuses, milestones, labels}`. Use this cache instead of re-fetching.

### 2. kanban(scope)

Group existing issues by `status.id` (default), `milestone.id`, `label`, or `assignee`. Render with `templates/kanban.md`.

```
list_issues(project | milestone | label, paged 50 at a time)
group by chosen axis
emit columns: Backlog | Todo | In Progress | In Review | Done
```

### 3. rollup(scope)

Aggregate child counts and health. Render with `templates/epic-status-board.md` (single project) or `templates/theme-rollup.md` (cross-project by label).

Health rule:

```
done       % == 100
empty      total == 0
stalled    no issue updated in 14d AND % < 100
atRisk     (target < today + 7d AND % < 80) OR blocked > 0
offTrack   target < today AND % < 100
onTrack    otherwise
```

### 4. triage(team)

Surface untagged or unowned issues. For each:

1. Read title + description.
2. Propose `theme:*`, `kind:*`, `owner:*`, `priority`.
3. Search for nearest 3 existing issues by title (`list_issues({ query: title })`).
4. Show the proposal. User approves, edits, or rejects per row.
5. Batch the writes.

### 5. decompose(parentIssue)

INVEST gate + Humanizing Work's 9 splitting patterns.

1. Read parent + acceptance criteria.
2. Run **INVEST** checklist (Independent, Negotiable, Valuable, Estimable, Small, Testable). Block if <2 of 6 pass.
3. Apply the 9 patterns in order, stop on first match:
   - Workflow Steps · CRUD · Business Rule Variations · Data Variations · Data Entry Methods · Major Effort · Simple/Complex · Defer Performance · Spike
4. Emit child issues using `templates/epic-breakdown.md` (each gets title, AC, estimate, INVEST recheck).
5. Confirm before write.
6. `save_issue` parent (label `kind:epic`), then `save_issue` children with `parentId`.
7. `save_comment` on parent: "Decomposed into N stories on YYYY-MM-DD."

## Iron Laws

These are non-negotiable. The skill should refuse to violate them.

1. **Read before write.** Always run `orient` first.
2. **State IDs over names.** State names are case-sensitive and team-customizable. Use IDs from `list_issue_statuses`.
3. **Filter every list.** Never call `list_issues` without `team` + `project` (the Layers list once exceeded the 25k token cap).
4. **Search before create.** Run `list_issues({ query: title })`. Surface top-3 candidates. Ask before creating duplicates.
5. **Cache the orient pass.** One orient call per session, reused.
6. **Confirm writes.** Reads are autonomous. `save_*` operations require user confirmation, except trivial comments on issues the user explicitly named.
7. **Vertical slices only.** Every story must touch end-to-end behavior. No "backend for X" / "frontend for X" splits.
8. **Owner-type required.** Every issue must have `owner:human` or `owner:agent` before it leaves the backlog.
9. **Status discipline.** Transition to `started` *before* doing the work, and to `completed`/`canceled` (or release) when done. Never leave a started issue stale. See `conventions.md` → "Multi-Agent Coordination" for the full claim protocol.
10. **Multi-agent claim protocol.** Multiple agents share the same Linear board. Before acting on an issue, re-fetch it and check three signals (state, delegate, assignee). If any says it's claimed by another agent, skip it. See `conventions.md` for the full decision flow.

## Human vs Agent Ownership

| Activity | Human-led | Agent-led |
|---|---|---|
| Set theme on a new issue | Optional | Auto-proposed by triage |
| Decompose an epic | Reviews INVEST output | Proposes the split |
| Write AC for a new feature | Owns | Drafts when prompted |
| Implement a story tagged `owner:agent` | — | Owns |
| Implement a story tagged `owner:human` | Owns | Suggests, doesn't act |
| Post a project status update | Confirms | Drafts the markdown |
| Close an issue | Confirms | Never closes silently |

Default heuristic: bug + small story → agent-eligible; epic decomposition + new-feature stories → human-led, agent-assisted.

## Verification After Writes

After every batch of writes, the skill should:

1. Re-fetch the affected entity (`get_issue`, `get_project`, etc.).
2. Confirm the field changed.
3. Print a one-line diff for each write so the user can verify.

## Portability

This skill is runtime-neutral. It uses no Claude-specific or Codex-specific features. It can be installed in any project that has a Linear MCP server connected. The conventions are the contract; the templates are how the skill speaks.

To install in a new project:

```bash
cp -r .claude/skills/linear-pm /path/to/new-project/.claude/skills/linear-pm
ln -s ../../.claude/skills/linear-pm /path/to/new-project/.codex/skills/linear-pm
```

Then create `bootstrap/<project>-bootstrap.md` for the new project's seed work.
