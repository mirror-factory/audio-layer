# MFDR Technical Decision Record

Updated: 2026-04-30T17:13:37.203Z
Status: draft
Source: generated

## Hypothesis
If Unvalidated: define the narrow first customer before broad implementation. get a starter-enforced workflow for AI product app managed by the AI Starter Kit., they will trust agent-built software faster because every surface has plans, docs, tests, browser evidence, and cost visibility.

## Product Thesis
AI product app managed by the AI Starter Kit.

## Research Basis
- design-md: DESIGN.md
- docs-apis-api-ai-logs-errors-md: docs/apis/api-ai-logs-errors.md
- docs-apis-api-ai-logs-md: docs/apis/api-ai-logs.md
- docs-apis-api-ai-logs-stats-md: docs/apis/api-ai-logs-stats.md
- docs-apis-api-control-plane-md: docs/apis/api-control-plane.md
- docs-apis-app-api-admin-pricing-activate-route-md: docs/apis/app-api-admin-pricing-activate-route.md
- docs-apis-app-api-admin-pricing-route-md: docs/apis/app-api-admin-pricing-route.md
- docs-apis-app-api-ai-logs-errors-route-md: docs/apis/app-api-ai-logs-errors-route.md

## Decisions
### product: Validate or narrow before broad implementation

Why: Unvalidated: define the narrow first customer before broad implementation.

Alternatives considered: Build broad feature set immediately; Stay in research only; Ship a concierge/manual prototype first
Tradeoffs: Faster build momentum; Less premature surface area; Requires explicit follow-up validation evidence
Evidence: .ai-starter/product-validation/latest.md
Verification: pnpm product:validate, pnpm plan -- "<feature>"

### architecture: .ai-starter remains the source of truth for repo state

Why: Plans, manifests, evidence, costs, docs, and scorecards survive chat compaction and runtime changes.

Alternatives considered: Keep state only in chat transcripts; Use only CI artifacts; Use an external project tracker as the canonical source
Tradeoffs: More generated files; Better handoff and auditability
Evidence: .ai-starter/manifests/starter.json, .ai-starter/manifests/setup.json
Verification: pnpm sync, pnpm score

### api: Track configured providers: assemblyai, custom-api-routes, resend, stripe, supabase, vercel-ai-gateway

Why: External APIs need docs, env requirements, cost events, failure modes, and contract tests.

Alternatives considered: Call providers directly without local registry; Rely only on provider dashboards; Block all custom providers
Tradeoffs: More upfront specification; Fewer silent runtime/provider failures
Evidence: .ai-starter/manifests/integrations.json
Verification: pnpm usage:record -- --integration=<id> --cost=<usd>, pnpm test

### ui: Use DESIGN.md and token registry as the UI contract

Why: Project-specific design system defined during setup; preserve existing product visual language when present.

Alternatives considered: Let each agent invent visual direction; Use only component library defaults; Require manual design review without local tokens
Tradeoffs: Design drift can block strict projects; Visual consistency improves across agent sessions
Evidence: DESIGN.md, .ai-starter/manifests/design.json
Verification: pnpm design:check, pnpm browser:proof

### verification: Require Playwright plus Expect browser-control proof for user-visible routes

Why: Playwright gives deterministic browser checks; Expect records agent-style browser command evidence.

Alternatives considered: Unit tests only; Manual screenshot inspection only; No browser proof for fast iterations
Tradeoffs: Needs a running local server; Catches more real user-experience failures
Evidence: .ai-starter/manifests/browser-proof.json, .expect/replays/
Verification: pnpm browser:proof, pnpm gates

## API And Service Plan
- AssemblyAI transcription (assemblyai): configured; cost=manual-estimate; env=ASSEMBLYAI_API_KEY
- Custom API routes (custom-api-routes): configured; cost=not-tracked; env=none
- Resend email (resend): configured; cost=provider-dashboard; env=RESEND_API_KEY
- Stripe payments (stripe): configured; cost=provider-dashboard; env=STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- Supabase (supabase): configured; cost=provider-dashboard; env=NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- Vercel AI Gateway (vercel-ai-gateway): configured; cost=ai-telemetry; env=AI_GATEWAY_API_KEY

## Tool Plan
- api:api-admin-pricing
- api:api-admin-pricing-activate
- api:api-ai-logs
- api:api-ai-logs-errors
- api:api-ai-logs-stats
- api:api-auth-api-key
- api:api-auth-send-email
- api:api-calendar-callback-[provider]
- api:api-calendar-connect-[provider]
- api:api-calendar-disconnect-[provider]
- api:api-calendar-upcoming
- api:api-chat

## UI Plan
- Design contract: Project-specific design system defined during setup; preserve existing product visual language when present.
- Tokens: Use DESIGN.md tokens and generated design registry before hardcoding visual values.
- Interaction model: Clear task-first flows with visible feedback and recoverable states.
- Visual proof: Capture screenshots and Expect replays after visual route/component changes.

## Verification Plan
- pnpm sync
- pnpm typecheck
- pnpm test
- pnpm browser:proof
- pnpm gates
- pnpm score
- pnpm report
- Browser proof: Run against the local dev server with AI_STARTER_BASE_URL or PLAYWRIGHT_BASE_URL set.
- Expect required: yes
- Storybook required: yes
- Design drift policy: warn

## Success Metrics
- Product validation is complete or explicitly bypassed with a reason.
- Feature plan has acceptance criteria and required evidence.
- Scorecard has no blockers.
- Expect proof reports successful browser-control commands for user-visible routes.
- External APIs/services have cost events or an explicit provider-dashboard/manual tracking reason.

## Risks
- The first customer/problem/workaround is not validated enough to justify broad build scope.
- Pricing is not validated; support and compute cost may exceed willingness to pay.
- Distribution is not validated; the first 100 users may be hard to reach.
- MFDR can become stale if API/tool/UI decisions change without rerunning `pnpm mfdr`.
- Browser proof requires a live local server and installed Expect CLI.

## Open Questions
- Complete product validation or record why it is bypassed.

## Next Step
Before broad implementation, run `pnpm mfdr`, then `pnpm plan -- "<first feature>"`, then implement only the next verified slice.
