# Linear PM Skill — Reuse & Install

This skill provides Linear-aware project management for both humans and agents. It's runtime-neutral and lives at `.claude/skills/linear-pm/` so Claude Code, Codex, and any other agent runtime can read it.

## What's in this directory

```
linear-pm/
├── SKILL.md            ← entry point (workflows, when-to-invoke, iron laws)
├── lexicon.md          ← 8-level PM hierarchy (single source of truth)
├── conventions.md      ← label namespaces, naming rules, agent-readiness checklist
├── README.md           ← this file
├── templates/
│   ├── epic-status-board.md   ← single-project rollup by milestone
│   ├── theme-rollup.md        ← cross-project rollup by theme:* label
│   ├── kanban.md              ← status-grouped board
│   ├── tree.md                ← initiative → project → milestone → issue tree
│   ├── triage.md              ← inbox triage with proposals
│   ├── epic-breakdown.md      ← INVEST + 9 splitting patterns
│   └── project-audit.md       ← what's missing on a project
└── bootstrap/
    ├── _template.md           ← copy-this template for new projects
    └── layers-bootstrap.md    ← filled-in bootstrap for the Layers project
```

## Requirements

- A Linear MCP server connected to the agent runtime.
- Workspace admin permissions if you need to create labels at the team level.

## Install in another project

```bash
# from the project that has linear-pm
cp -r .claude/skills/linear-pm /path/to/new-project/.claude/skills/linear-pm

# Codex sees the same skill via symlink
mkdir -p /path/to/new-project/.codex/skills
ln -s ../../.claude/skills/linear-pm /path/to/new-project/.codex/skills/linear-pm

# create the project's bootstrap
cd /path/to/new-project
cp .claude/skills/linear-pm/bootstrap/_template.md \
   .claude/skills/linear-pm/bootstrap/<project-slug>-bootstrap.md
```

Edit the new bootstrap file with your project's specifics (initiative name, milestone set, theme overrides, issue dispositions).

## How agents discover the skill

Most modern agent runtimes auto-discover anything under `.claude/skills/<name>/SKILL.md`. The first description line ("> Read-first Linear project management…") is what the runtime shows in the available-skills list, so keep it accurate after edits.

## Triggering it

The user invokes the skill with natural language:

- "What's the state of \<project\>?"
- "Triage the \<team\> inbox."
- "Decompose \<issue ID\>."
- "Bootstrap a new project for \<name\>."

The skill reads orient first (`list_teams`, `list_projects`, `list_milestones`, `list_issue_statuses`, `list_issue_labels`), caches the result for the session, then performs the requested operation. Writes always wait for confirmation.

## What this skill is not

- It's **not** a Linear UI replacement. The user still works in Linear directly for editing single fields, adding emoji, configuring views.
- It's **not** a CI/CD tool. It doesn't trigger builds, run tests, or deploy.
- It's **not** a calendar. It tracks completion dates but doesn't schedule.
- It's **not** opinionated about agile flavor. INVEST and the 9 splitting patterns are framework-agnostic; cycles are optional.

## Trouble with the Linear MCP

If the skill says "Linear MCP not loaded":

1. Confirm `.mcp.json` includes a Linear server entry.
2. Confirm the OAuth flow has been completed for the workspace.
3. Run a sanity check: `list_teams` should return non-empty.

If the team has no `theme:*` labels yet, run the bootstrap once. Subsequent runs reuse the labels.

## Versioning

The skill is content-addressable: edit the markdown files and commit. There's no build step. Agents read the latest files at session start.

## Companion docs

- `docs/LAUNCH_CHECKLIST.md` — Layers launch readiness criteria
- `docs/V1_PLAN.md` — Layers V1 sprint plan
- `bootstrap/layers-bootstrap.md` — concrete Layers Linear setup
