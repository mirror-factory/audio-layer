@AGENTS.md

<!-- AI_STARTER_CONTRACT_START -->

## AI Starter Kit Contract

This repo uses the AI Starter Kit as a strict-by-default repo operating system.

## Agent Strategy

- Planning: create or update a plan before feature-sized code changes.
- Context: inspect registries, manifests, docs, and existing repo patterns before writing.
- Research: use the Active Research Cache before dependency, framework, provider, or fast-moving API work.
- Verification: run typecheck, tests, gates, browser proof, and evidence-generating checks before handoff.
- Models: use stronger Sonnet/Opus-class models for implementation and review; use Haiku-class models for bounded rubric/eval checks when appropriate.

## AI SDK v6 Patterns (CRITICAL)

- Use `inputSchema` instead of `parameters` in AI SDK tool definitions.
- Keep all tools represented in `TOOL_META` or the local tool registry.
- Preserve telemetry wiring for streamText/generateText surfaces.

## Tool System

| name | type | category | description |
|------|------|----------|-------------|
| starter-control-plane | local | repo-os | Reads manifests, hooks, evidence, features, runs, and telemetry. |
| starter-plan | local | planning | Writes machine-readable plan artifacts before scoped feature work. |
| starter-score | local | verification | Scores readiness from coverage, evidence, and registry state. |

## Runtime Registry

- `AGENTS.md` is the portable agent contract and is read by Codex.
- `.codex/config.toml` and `.codex/hooks.json` configure Codex hooks when the Codex runtime is enabled.
- `.claude/settings.json` configures Claude Code hooks when the Claude runtime is enabled.
- Runtime status is tracked in `.ai-starter/manifests/runtimes.json`.

## OpenAI Documentation

When working with OpenAI, Codex, ChatGPT Apps SDK, Responses API, Agents SDK, or model behavior, use the OpenAI developer documentation MCP server first:

```bash
codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp
```

## Skill Registry

Runtime-specific skills may live in `.claude/skills`, Codex plugins/skills, or other agent tooling. Read the relevant skill or docs file before acting on visual QA, telemetry wiring, compliance fixes, or research-first changes.

## Active Research Cache

Research freshness is tracked under `.ai-starter/research`. Refresh stale entries before changing dependencies, model/provider APIs, browser automation, or unfamiliar libraries.

## Required Commands

```bash
pnpm typecheck
pnpm test
pnpm gates
pnpm sync
pnpm score
pnpm report
```

CLAUDE.md can contain project-specific instructions above or below this starter-managed contract.

<!-- AI_STARTER_CONTRACT_END -->
