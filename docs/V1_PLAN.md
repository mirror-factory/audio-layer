# Layer One Audio V1 Execution Plan

**Date:** 2026-04-24
**Branch baseline:** `v2/clean-rebuild`
**Purpose:** Convert the strategy handoff into an executable V1 plan with a proper testing layer for API routes, AI tools, MCP tools, web flows, native shells, observability, performance, and UI polish.

This plan is branch-accurate for the current checkout. Unlike the external handoff note, this branch already contains embeddings/search code, `app/api/mcp/[transport]/route.ts`, `lib/mcp/*`, generated iOS/Android folders, Electron, and an existing Playwright/Vitest test base.

---

## 1. Product Direction

Layer One should not compete as another generic meeting notetaker. V1 should ship as the meeting-to-agent layer for technical teams already living in Claude, ChatGPT, Cursor, Linear, Notion, and similar tools.

The product promise for V1:

- Capture meetings without a bot where possible.
- Produce high-quality diarized transcripts, summaries, action items, and structured facts.
- Make meeting context searchable and available inside external AI tools through MCP/API.
- Keep cost transparent and sustainable by defaulting to cheaper provider routes.
- Feel reliable, fast, and work-focused across web, desktop, and mobile.

---

## 2. Current State

Already present:

- Web app: Next.js 15, React 19, Tailwind v4.
- AI SDK v6 with Vercel AI Gateway.
- Supabase-backed meetings, profiles, settings, embeddings, and search.
- AssemblyAI batch and streaming integration.
- Stripe checkout/webhook code.
- MCP endpoint at `app/api/mcp/[transport]/route.ts`.
- AI tool registry under `lib/ai/tools/*`.
- Tests: Vitest unit tests, Playwright e2e/visual tests, API smoke scaffolding.
- Native shells: Electron, Capacitor iOS/Android folders.
- Dev-kit registries and validation commands.

Known risk areas:

- API smoke coverage only exercises a small subset of routes.
- MCP auth/tool behavior needs adversarial tests, especially concurrent requests and wrong-user access.
- AI tool metadata exists, but tool eval coverage is inconsistent.
- Vendor integrations need mock-mode contract tests plus a small live-canary path.
- Upload/transcription flow must handle files larger than Vercel request limits.
- Cost defaults need to move away from the most expensive STT/LLM path.
- UI polish exists in pieces, but needs a route-by-route quality pass.

---

## 3. Execution Order

Do not start with a broad rebuild. The right order is:

1. **Test foundation first** - make the app hard to regress.
2. **Cost defaults second** - switch provider defaults to the sustainable path.
3. **MCP/tool hardening third** - this is the strategic wedge.
4. **Meeting chat/search workflows fourth** - make the user-facing value obvious.
5. **Recording reliability fifth** - desktop and mobile capture need real-device proof.
6. **Billing/auth/quota sixth** - verify money and entitlement paths end-to-end.
7. **Optimization and polish continuously** - measure first, then improve.

---

## 4. Testing Architecture

V1 needs layered tests, not more one-off specs. Every layer has a clear owner and failure class.

| Layer | Primary tool | What it catches | Required gate |
|---|---|---|---|
| Static | TypeScript, ESLint, dev-kit validate | Type drift, lint regressions, registry drift | Every PR |
| Unit | Vitest | Pure schema, pricing, stores, utility logic | Every PR |
| API contract | Playwright request + Vitest manifest tests | Route shape, auth, JSON errors, request IDs, no 500s | Every PR touching `app/api` |
| Tool contract | Vitest + eval cases | AI tool schemas, metadata, handler behavior, malformed inputs | Every PR touching `lib/ai/tools` |
| MCP protocol | Playwright request or Vitest HTTP harness | JSON-RPC handshake, bearer auth, tool calls, wrong-user probes | Every PR touching MCP/search/auth |
| Data/RLS | Supabase local integration tests | Cross-user leakage, migration drift, policy gaps | Every PR touching Supabase/store/search |
| Vendor boundary | Mocked integration tests + live canary | Provider payload drift without burning money in CI | Nightly and before release |
| Web flows | Playwright | Sign-in, record, meeting detail, search, chat, settings, billing | Every PR touching UI flows |
| Visual/a11y | Playwright screenshots + accessibility checks | Layout drift, contrast/focus/keyboard regressions | Every PR touching components/pages |
| Native | Capacitor/Electron build checks and manual device pass | Permission, status bar, audio capture, shell packaging | Release branch |
| Performance | Lighthouse/Playwright trace/bundle checks | LCP/INP/CLS, JS bloat, slow API paths | Weekly and release branch |
| Observability | Route/tool span assertions | Missing request IDs, run IDs, vendor cost logs | Every PR touching routes/tools/vendors |

### Mandatory Invariants

These should run in one stable suite and stay green across all feature work:

1. No route returns an unhandled 500 for expected bad input.
2. API error bodies are JSON and include a stable error shape.
3. Protected API actions return 401/403, not 500 or accidental 200.
4. All API responses include `x-request-id`.
5. Wrong-user meeting/search/MCP probes return no data.
6. No secret-like values appear in client bundles or committed diffs.
7. Cost dashboard totals match per-meeting cost rows within `$0.01`.
8. No browser console errors on primary pages.
9. Light/dark and mobile/desktop viewports have no horizontal overflow.
10. Tool registries and docs do not drift from implemented tools.

---

## 5. API Testing Layer

Build a real API contract layer around the existing `tests/api/route-smoke.test.ts`.

### Deliverables

1. Add `tests/api/route-contracts.ts`.
   - One entry per `app/api/**/route.ts`.
   - Fields: path, methods, auth mode, request fixture, expected statuses, expected response shape, mocked dependencies.
   - Include dynamic routes with representative IDs.

2. Refactor `tests/api/route-smoke.test.ts`.
   - Generate tests from `route-contracts.ts`.
   - Assert JSON body for every API response except explicitly documented stream/redirect endpoints.
   - Assert `x-request-id`.
   - Assert status allow-list and fail on unexpected 500.

3. Add API behavior tests for high-risk routes.
   - `/api/transcribe`: missing audio, too-large audio, quota reached, mocked provider success.
   - `/api/transcribe/[id]`: processing, completed, provider error, summary generation error.
   - `/api/transcribe/stream/*`: token issue, autosave, finalize, invalid token.
   - `/api/meetings` and `/api/meetings/[id]`: owner access, wrong-user access, invalid ID.
   - `/api/search`: empty query, max query, wrong-user results.
   - `/api/settings`: defaults, update validation, persistence.
   - `/api/stripe/*`: checkout auth, webhook signature valid/invalid.
   - `/api/oauth/*`: invalid client, bad redirect URI, token exchange failure.
   - `/api/mcp/[transport]`: see MCP section.

4. Add route coverage guard.
   - A Vitest test scans `app/api/**/route.ts`.
   - It fails when a route lacks a contract entry.
   - This turns "new endpoint without tests" into a fast local failure.

### API Done Criteria

- Every API route has at least smoke coverage.
- Every write or vendor route has behavior coverage.
- Every auth-protected route has unauth and wrong-user coverage.
- Every route uses the shared error/request-id convention or documents why it cannot.

---

## 6. AI Tool And MCP Testing Layer

There are two tool surfaces and both need coverage:

- **AI SDK tools** in `lib/ai/tools/*`.
- **MCP tools** exposed through `app/api/mcp/[transport]/route.ts` and `lib/mcp/*`.

### AI SDK Tool Deliverables

1. Add `tests/tools/tool-registry.test.ts`.
   - Metadata exists for every exported tool.
   - Metadata names match implementation names.
   - Descriptions are long enough to be useful.
   - Permission tier, access level, service, and cost estimate are present.
   - `testStatus: "untested"` fails unless the tool is explicitly in an allow-list with a dated TODO.

2. Add one contract test per tool.
   - Valid input succeeds.
   - Invalid input fails schema validation.
   - External dependencies are mocked.
   - Client-side tools are never executed server-side.

3. Add eval cases for generative tools.
   - Store under `tests/evals/tools/<tool-name>.yaml` or equivalent promptfoo config.
   - Each eval includes happy path, malformed input, and adversarial prompt injection.
   - Add a CI command that runs the cheap deterministic subset by default.

### MCP Deliverables

1. Add `tests/mcp/protocol.test.ts`.
   - `initialize` works without auth.
   - `notifications/*` works without auth.
   - `tools/list` requires bearer auth.
   - `tools/call` requires bearer auth.
   - Invalid bearer returns JSON 401.
   - Valid bearer lists the expected tools.

2. Add `tests/mcp/tools.test.ts`.
   - `list_meetings` only returns meetings for the authenticated user.
   - `get_meeting`, `get_transcript`, and `get_summary` cannot access another user's meeting.
   - `search_meetings` scopes by user ID.
   - Tool schema max/min limits are enforced.

3. Add a concurrency test.
   - Two users call MCP tools in parallel.
   - Assert user A never receives user B data.
   - This is important because the current MCP route uses module-level auth state and should be replaced by per-request context if the test exposes leakage.

4. Add MCP docs examples.
   - Document auth headers, initialize behavior, and each tool contract.
   - Keep examples synchronized with tests.

### Tool Done Criteria

- New AI tools require metadata, unit contract tests, and eval cases.
- New MCP tools require schema tests, wrong-user tests, and docs.
- `ai-dev-kit tool validate` passes.

---

## 7. Data, RLS, And Search Tests

### Deliverables

1. Add deterministic seed data.
   - `tests/fixtures/users.ts`.
   - `tests/fixtures/meetings.ts`.
   - At least two users, three meetings each, and overlapping keywords to catch leaks.

2. Add Supabase-local integration suite.
   - Migrations apply cleanly.
   - Policies allow owner access.
   - Policies deny wrong-user access.
   - Service-role paths still manually scope by `user_id`.

3. Add search correctness tests.
   - Empty query returns 400.
   - Exact keyword match ranks above irrelevant result.
   - Semantic mock result is fused with keyword result deterministically.
   - Wrong-user result is excluded even when it ranks highest.

4. Add embedding pipeline tests.
   - Meeting completion triggers embed job in mock mode.
   - Failed embedding does not fail transcript completion.
   - Cost row includes embedding cost when present.

---

## 8. Vendor Boundary Tests

V1 should not rely on live providers for normal CI. Use mocks by default and live canaries sparingly.

### Mock-Mode Requirements

- AssemblyAI mock: upload, transcript submit, transcript poll, realtime token, streaming finalization.
- AI Gateway mock: summary, intake extraction, chat, embeddings.
- Stripe mock: checkout session, customer portal, webhook signature events.
- Resend mock: send success, send failure, rate limit.
- Supabase mock only for pure unit tests; use local Supabase for RLS integration.

### Live Canary Requirements

- One short AssemblyAI batch canary.
- One AI Gateway summarization canary.
- One Stripe CLI webhook replay canary.
- One Supabase migration/RLS canary.
- Run live canaries nightly or manually before release, not on every PR.

---

## 9. Feature Plan

### Sprint 0 - Baseline And Inventory

- Create route contract manifest.
- Create tool/MCP test skeletons.
- Add invariant test suite.
- Confirm all current docs reflect the current branch, not older worktrees.
- Produce one baseline verification run and record failures.

### Sprint 1 - Test Foundation

- Finish API smoke coverage for all routes.
- Add MCP protocol tests.
- Add AI tool registry/contract tests.
- Add seed fixtures.
- Add mock providers.
- Wire new commands into package scripts and CI.

Target commands:

```bash
pnpm typecheck
pnpm test
pnpm test:api
pnpm test:mcp
pnpm test:tools
npx eslint .
ai-dev-kit tool validate
```

### Sprint 2 - Cost And Model Routing

- Move default batch STT to lower-cost provider route or lower-cost AssemblyAI model where product quality allows.
- Move summary defaults to the cheapest acceptable LLM route.
- Keep premium models available by tier/task.
- Add model-routing tests for every task: summary, intake, chat, embeddings, action items.
- Add cost regression tests that fail if default blended cost rises unexpectedly.

### Sprint 3 - MCP And Public API Hardening

- Replace any request-global auth state in MCP with per-request scoped context.
- Verify initialize/no-auth and tools/auth behavior end-to-end.
- Add API key lifecycle tests: create, display-once, revoke, invalid key.
- Add public docs for MCP setup and API authentication.
- Add rate limits and structured errors.

### Sprint 4 - Meeting Chat, Search, And Templates

- Add meeting-detail chat on `/meetings/[id]`.
- Add template picker for common workflows: sales discovery, interview debrief, standup, custom.
- Keep completed-meeting chat useful when AI model credentials are unavailable by answering from saved summary, decisions, actions, intake fields, and transcript segments.
- Use structured schemas for template outputs.
- Add e2e tests for chat happy path, empty transcript, long transcript, wrong-user meeting, aborted stream.
- Add evals for template quality.

### Sprint 5 - Recording Reliability

- Verify batch upload with files larger than Vercel's request limit through a storage-backed path.
- Verify AssemblyAI realtime streaming with actual token/session path.
- Harden live recorder autosave/finalize behavior.
- Run Electron/Capacitor permission tests.
- Document manual real-device pass.

### Sprint 6 - Billing, Auth, And Quotas

- Verify anonymous-to-email merge.
- Verify magic-link sign-in.
- Verify Stripe checkout, webhook, subscription status, and portal.
- Enforce quotas with clear downgrade paths instead of surprise hard stops.
- Add tests for free, pro, team, canceled, and past-due states.

### Sprint 7 - Workspaces

- Add organization/workspace schema and RLS.
- Add invite flow and member roles.
- Add shared meetings and team search.
- Add wrong-org leak probes.
- Add workspace-level cost and usage reporting.

### Sprint 8 - Optimization, Polish, And Release Hardening

- Run performance baseline and optimize measured bottlenecks.
- Complete route-by-route UI polish pass.
- Run visual/a11y checks across supported viewports.
- Run live vendor canaries.
- Run full verification loop.
- Cut release candidate.

---

## 10. Optimization Plan

Measure before changing. Optimization work must produce a before/after note.

### Web Performance

- Record LCP, INP, CLS, total JS, route bundle sizes, and primary API latency.
- Split heavy visuals from product routes where they are not needed.
- Keep Three.js/WebGL isolated to routes that actually use it.
- Prefer Server Components for read-heavy pages.
- Use pagination and lazy loading for meeting lists.
- Use stable dimensions for recorder, waveform, transcript, and card layouts to prevent CLS.
- Defer non-critical observability/dev-kit scripts outside production user flows.

### API Performance

- Add pagination to list endpoints.
- Add query timing logs for meetings/search routes.
- Check Supabase indexes for user/date/search access patterns.
- Add storage-backed upload path for large audio.
- Avoid blocking transcript completion on embeddings, webhooks, or email side effects.
- Cache low-risk settings/model metadata responses with explicit invalidation.

### Native Performance

- Keep capture work off the UI thread.
- Measure CPU/battery impact during long recordings.
- Persist intermediate state often enough to survive crashes without writing every audio frame to JS.
- Verify app startup time on desktop and mobile shells.

---

## 11. Polish Plan

The product UI should feel quiet, dense, and work-focused. It should not feel like a marketing page once the user is inside the app.

### Polish Pass Order

1. `/record` and `/record/live` - recording clarity, permission states, failure recovery.
2. `/meetings` and `/meetings/[id]` - scanning, transcript readability, summary hierarchy, export affordances.
3. `/search` and `/chat` - input behavior, result ranking clarity, loading/empty/error states.
4. `/profile`, `/settings`, `/usage`, `/pricing` - billing trust, API key clarity, quota transparency.
5. `/observability` and `/dev-kit/*` - internal admin density and consistency.
6. Landing/docs only after core app routes are stable.

### Polish Checklist

- All interactive elements have hover, focus, active, disabled, loading, and error states.
- Keyboard navigation works through all forms, menus, tabs, and chat inputs.
- Touch targets are at least 44px on mobile.
- Empty states explain the next action without marketing copy.
- Error states say what failed and how to recover.
- Long meeting titles, long speaker names, and long transcript turns do not break layout.
- No horizontal overflow at mobile, tablet, or desktop widths.
- Light and dark themes use approved tokens only.
- Component screenshots are stable across viewport/theme projects.
- No console errors on primary flows.

---

## 12. Documentation Requirements

Every feature change needs the matching docs update:

- API route added or changed: update API docs and route contract.
- AI tool added or changed: update tool metadata, eval case, and docs.
- MCP tool added or changed: update MCP docs and examples.
- Component added: update component docs/registry.
- Pricing/cost routing changed: update pricing/billing docs and cost tests.
- Native behavior changed: update platform docs.

---

## 13. Definition Of Done

A V1 work item is done only when:

- The feature works in the app.
- The relevant API/tool/data/UI/native tests exist.
- Happy path, unauth/wrong-user, and adversarial cases are covered where applicable.
- Observability emits request IDs, run IDs, provider spans, and cost rows where applicable.
- Docs and registries are updated.
- Full verification loop passes, or remaining failures are documented with exact commands and errors.

Full verification loop:

```bash
pnpm typecheck
pnpm test
npx eslint .
ai-dev-kit tool validate
```

Use the narrower suites while developing, but do not call a feature complete without the full loop.
