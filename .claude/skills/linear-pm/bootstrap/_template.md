# Bootstrap template — `<project-slug>`

Per-project setup script for the Linear PM skill. Copy this template, fill in the `<...>` slots, and execute step by step.

## Inputs

- **Project name:** `<e.g., Layers>`
- **Team:** `<team key, e.g., PROD>`
- **Initiative name:** `<outcome verb + measurable noun>`
- **Initiative target date:** `<YYYY-MM-DD>`
- **Initiative success metric:** `<measurable definition of done>`
- **Lead:** `<email or "me">`

## Theme set (project-specific)

Default 10 from `conventions.md`. Add or remove for this project:

- [ ] `theme:install`
- [ ] `theme:test`
- [ ] `theme:onboard`
- [ ] `theme:billing`
- [ ] `theme:platform`
- [ ] `theme:editor`
- [ ] `theme:context`
- [ ] `theme:integrations`
- [ ] `theme:observability`
- [ ] `theme:landing`
- [ ] `theme:<custom>`

## Milestones (project-specific)

Six milestones from V1 sprint plan. Edit per project:

| # | Name | Phase rationale | Approx duration |
|---|---|---|---|
| M1 | `<phase 1>` | `<why this comes first>` | `<weeks>` |
| M2 | `<phase 2>` | | |
| M3 | `<phase 3>` | | |
| M4 | `<phase 4>` | | |
| M5 | `<phase 5>` | | |
| M6 | `<phase 6>` | | |

## Execution order

1. **Audit** — run `project-audit` template, confirm findings with user.
2. **Initiative** — `save_initiative` (create or attach existing)
3. **Project** — `save_project` to attach project to initiative
4. **Old milestones** — `save_milestone` archive each obsolete milestone (children stay attached, hidden under canceled status)
5. **New milestones** — `save_milestone` create the new set
6. **Labels** — `create_issue_label` for each `theme:*`, `kind:*`, `owner:*`
7. **Issues** — for each existing issue: `save_issue` to set milestone + theme + owner; cancel out-of-scope issues
8. **Document** — `save_document` for the project Roadmap (links back to skill)
9. **Status update** — `save_status_update` reflecting current health
10. **Verify** — re-fetch project + issues, render `epic-status-board.md`

## Verification

Once complete, the user should be able to:

- Open the project in Linear and see the new milestone set as columns in Board view (Group by → Milestone).
- Filter to any `theme:*` label and see only issues for that workstream.
- Open the Roadmap document and see the source-of-truth pointer to the skill.
- Read the project's most recent status update.

## Rollback

If something is wrong:

- New milestones can be archived via `save_milestone` with no `id` change.
- Labels removed by un-tagging issues; orphan labels can be left or deleted in the Linear UI.
- Initiative attachment removed via `save_project { removeInitiatives: [...] }`.

The skill never deletes data destructively. All "removals" are archive-or-detach.
