# AI Starter Alignment

Updated: 2026-04-30T17:13:37.204Z
Status: attention-needed

## Summary
audio-layer: AI product app managed by the AI Starter Kit.

## Anchors
- YC-style product spec: [.ai-starter/product-spec/latest.md](.ai-starter/product-spec/latest.md) (draft) - Keeps customer, painful problem, wedge, MVP, metrics, pricing, and distribution in scope.
- Product validation memo: [.ai-starter/product-validation/latest.md](.ai-starter/product-validation/latest.md) (missing-inputs) - Justifies whether the product or feature should be built before widening scope.
- MFDR technical decision record: [.ai-starter/mfdr/latest.md](.ai-starter/mfdr/latest.md) (draft) - Justifies architecture, APIs, tools, UI, costs, risks, alternatives, and verification choices.
- Design contract: [DESIGN.md](DESIGN.md) (defaults) - Preserves product visual direction, interaction density, accessibility, tokens, and drift policy.
- Agent context: [AGENTS.md](AGENTS.md) (present) - Portable compressed contract for Codex, Claude, and other coding agents.

## Required Reads
- .ai-starter/product-spec/latest.md
- .ai-starter/product-validation/latest.md
- .ai-starter/mfdr/latest.md
- DESIGN.md
- AGENTS.md

## Recurring Context
- Product: Unvalidated: define the narrow first customer before broad implementation. / Unanswered. Define the painful job before broad implementation.
- Wedge: Start with one workflow for Unvalidated: define the narrow first customer before broad implementation. that proves "Unanswered. Define the painful job before broad implementation." can be solved with visible evidence.
- Technical: If Unvalidated: define the narrow first customer before broad implementation. get a starter-enforced workflow for AI product app managed by the AI Starter Kit., they will trust agent-built software faster because every surface has plans, docs, tests, browser evidence, and cost visibility.
- Design: Project-specific design system defined during setup; preserve existing product visual language when present.
- Active plan: Create launch checklist and agent swarm workstream document
- Scorecard: 100/100 with 0 blocker(s)

## Commands
- `pnpm product:spec`
- `pnpm product:validate`
- `pnpm mfdr`
- `pnpm plan -- "<task>"`
- `pnpm sync`
- `pnpm score`
- `pnpm report`

## Open Gaps
- Product spec is still draft; fill missing customer/problem/market fields or explicitly bypass.
- Product validation is incomplete; run `pnpm product:validate` or record a bypass reason.
- MFDR is not complete; run `pnpm mfdr --complete` after research and decisions are explicit.
