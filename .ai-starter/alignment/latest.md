# AI Starter Alignment

Updated: 2026-04-30T18:01:17.437Z
Status: ready

## Summary
audio-layer: Record without a meeting bot. Leave with a transcript, live summary, key points, action items, follow-up context, and searchable memory your AI tools can use.

## Anchors
- YC-style product spec: [.ai-starter/product-spec/latest.md](.ai-starter/product-spec/latest.md) (complete) - Keeps customer, painful problem, wedge, MVP, metrics, pricing, and distribution in scope.
- Product validation memo: [.ai-starter/product-validation/latest.md](.ai-starter/product-validation/latest.md) (complete) - Justifies whether the product or feature should be built before widening scope.
- MFDR technical decision record: [.ai-starter/mfdr/latest.md](.ai-starter/mfdr/latest.md) (complete) - Justifies architecture, APIs, tools, UI, costs, risks, alternatives, and verification choices.
- Design contract: [DESIGN.md](DESIGN.md) (defaults) - Preserves product visual direction, interaction density, accessibility, tokens, and drift policy.
- Agent context: [AGENTS.md](AGENTS.md) (present) - Portable compressed contract for Codex, Claude, and other coding agents.

## Required Reads
- .ai-starter/product-spec/latest.md
- .ai-starter/product-validation/latest.md
- .ai-starter/mfdr/latest.md
- DESIGN.md
- AGENTS.md

## Recurring Context
- Product: Founders, product teams, and GTM teams that run frequent planning, customer, and sales meetings and need decisions, owners, follow-ups, and context available immediately after the call. / Important decisions and action items get scattered across transcripts, manual notes, Slack, email, calendars, and AI chats. Existing meeting bots can feel intrusive, miss context, and rarely produce structured outputs that teams can search, share, or reuse in AI tools.
- Wedge: Start with one workflow for Founders, product teams, and GTM teams that run frequent planning, customer, and sales meetings and need decisions, owners, follow-ups, and context available immediately after the call. that proves "Important decisions and action items get scattered across transcripts, manual notes, Slack, email, calendars, and AI chats. Existing meeting bots can feel intrusive, miss context, and rarely produce structured outputs that teams can search, share, or reuse in AI tools." can be solved with visible evidence.
- Technical: If founders, product teams, and GTM teams can record meetings without a bot and immediately receive trustworthy transcript, summary, decision, and action-item memory, they will adopt Layer One as the meeting context layer for their AI workflows.
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
- None recorded.
