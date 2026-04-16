# AI Starter Hub

This file is the shortest explanation of what the starter added to your project.

## What was installed

- AI tool registry templates
- observability helpers and routes
- browser smoke and visual test templates
- compliance and verification scripts
- agent context and skills

## Where to look first

- `AGENTS.md` for compressed AI guidance
- `lib/ai/tools/` for tool registry files
- `tests/e2e/` for browser checks
- `app/observability/page.tsx` for the observability route
- `scripts/check-compliance.ts` for the compliance scan

## What the registry does

It does not move files.

It tells the system:
- what tools exist
- how they should render
- what tests and docs should stay aligned

## The basic workflow

1. Finish your tool metadata and registry
2. Wire the real routes and components
3. Run compliance and tests
4. Open observability and inspect a real AI run
5. Keep docs and generated assets fresh

## Recommended central routes

- `/ai-starter` for this hub page
- `/observability` for logs and traces
- your app’s main AI route such as `/chat`
