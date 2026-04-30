---
name: mfdr
description: Create or update the MFDR technical decision/spec record for product hypothesis, research basis, API/service choices, tool strategy, UI direction, setup decisions, risks, and verification. Use before major product architecture choices, external API integrations, AI tool/runtime decisions, UI system direction changes, or MVP implementation plans.
---

# MFDR

Use this skill to turn product intent and technical choices into a durable decision/spec record. The MFDR is not a generic architecture doc; it must explain what is being built, why this approach is chosen, what evidence supports it, and how the repo will prove it works.

## Starter Artifacts

- Write the durable memo to `.ai-starter/mfdr/latest.md`.
- Write machine state to `.ai-starter/mfdr/latest.json`.
- Keep `.ai-starter/manifests/mfdr.json` synced.
- Run `pnpm mfdr`, then `pnpm sync`, then `pnpm score` after changing major product/API/tool/UI/verification decisions.

## Inputs To Extract

Capture these from the prompt, setup config, product validation, docs registry, and existing code:

- Hypothesis: what must be true for this product/feature to matter
- Product thesis: what is being built and for whom
- Research basis: docs, competitors, APIs, internal code, market facts, and known constraints
- API/service choices: providers, env vars, failure modes, costs, docs, and tests
- Tool choices: deterministic tools, AI tools, skills/workflows, runtime hooks, and MCP/provider decisions
- UI choices: design contract, tokens, layout model, interaction model, accessibility, and visual proof
- Setup choices: provider/model, integrations, policy strictness, runtime support, and env contract
- Verification plan: unit, contract, Playwright, Expect, Storybook, design drift, gates, score, report
- Risks: product, technical, security, cost, reliability, and support risks
- Open questions: anything that would materially change the approach

Ask only if a missing answer would change the decision. Otherwise proceed with labeled assumptions and record the open question.

## Decision Quality

For each major choice, record:

- Area: product, architecture, API, tooling, UI, data, verification, or operations
- Choice: the selected approach
- Why: the reason this is better than the alternative right now
- Tradeoffs: what this makes harder
- Evidence: docs, code, validation, screenshots, tests, or research supporting it
- Verification: exact command or proof that confirms it

## Required Coverage

The MFDR should explicitly cover:

- Product hypothesis and smallest useful MVP
- API/service plan, including custom APIs not inside AI Gateway
- Cost tracking plan for AI and non-AI providers
- Tooling/agent-runtime plan for Codex and Claude where enabled
- Design system and visual evidence approach
- Test strategy, including Expect browser-control proof for user-visible routes
- Risk and rollback/escalation plan

## Output Structure

Use this structure:

```markdown
## Hypothesis

## Product Thesis

## Research Basis

## Decisions

## API And Service Plan

## Tool Plan

## UI Plan

## Verification Plan

## Success Metrics

## Risks

## Open Questions

## Next Step
```

## Quality Bar

The output should be specific enough that another agent can implement the next feature without relying on chat memory. Avoid vague statements like "use best practices"; name the provider, docs, tests, commands, screenshots, costs, failure modes, and design contract that prove the decision.
