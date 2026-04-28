# AI Starter Hub

This page is the short, truthful explanation of what the starter added to a project.

## What the starter installs

- starter state in `.ai-starter/`
- setup config in `.ai-starter/config.json`, setup health in `.ai-starter/manifests/setup.json`, and safe env placeholders in `.env.example`
- Codex hooks in `.codex/hooks/`, `.codex/hooks.json`, and `.codex/config.toml`
- Claude hooks in `.claude/hooks/` and `.claude/settings.json`
- runtime state in `.ai-starter/manifests/runtimes.json`
- lifecycle scripts like `starter:setup`, `sync`, `plan`, `score`, `report`, `iterate`, `usage:record`, `evidence:export`, `design:check`, `test:codex-runtime`, `test:claude-runtime`, and `test:claude-scenarios`
- observability and starter hub routes with a black/white pixel dashboard identity
- baseline verification, gates, browser proof, screenshot comparison, and local cost/usage evidence
- starter-aware Stop autopilot pressure that feeds the active agent the next required action when it tries to stop too early

## The intended flow

1. Install the starter.
2. Run `pnpm run starter:setup` to configure provider, env contract, modules, integrations, policy, and design direction.
3. Put real secrets in `.env.local` or pull with `vercel env pull .env.local --yes`.
4. Run `pnpm sync` to generate starter manifests.
5. Run `pnpm plan -- "..."` before feature work.
6. Implement while hooks enforce plan and research rules.
7. Run `pnpm score`, `pnpm report`, `pnpm test:codex-runtime`, `pnpm test:claude-runtime`, and `pnpm test:claude-scenarios`.
8. Run `pnpm iterate` when the app is running to produce browser proof, screenshot comparison, gates, score, and one safe companion scaffold if needed.
9. Record direct API cost with `pnpm usage:record -- --integration=your-api --cost=0.01`, `recordApiUsage()`, or `trackedFetch()`.
10. Run `pnpm design:check` when UI changes touch app/components.
11. Run `pnpm evidence:export` or use the dashboard export action before sharing evidence with another agent.
12. Open `/control-plane` and `/observability`.
13. Use `/control-plane` dashboard actions for dev-only allowlisted runs like setup refresh, `sync`, `score`, `gates`, browser proof, tool rubrics, design drift, API contract, usage proof, and evidence export.

If Codex or Claude tries to stop while obvious work remains, `stop-check.py` reads the plan, scorecard, companions, evidence, browser proof, report, and export state. It blocks the stop with one compact continuation packet instead of dumping the whole repo into context.

## The key routes

- `/ai-starter` or `/control-plane` for starter-system state, visual diff drilldowns, and local repo OS health
- `/observability` for AI runtime inspection
- `/api/control-plane` for machine-readable setup, manifests, score, evidence, integrations, usage events, dashboard actions, export state, and latest iteration screenshot comparison
- `/control-plane` runtime tab for Codex/Claude configured state, observed hook events, proof status, and warnings
- your real product route such as `/chat`

## What this starter does not promise yet

It does not yet silently mutate every surface:

- Storybook still needs generated or human-reviewed stories.
- Browser specs still need meaningful assertions.
- Screenshot-driven UI rewrites remain bounded by `/iterate`.
- Broad autonomous code mutation is still blocked until evidence gates pass.

Those are future layers. This starter gives the backbone and records screenshot comparisons during bounded iteration:

- state
- flow
- enforcement
- visibility
