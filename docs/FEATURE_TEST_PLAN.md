# Feature Test Plan

This checklist is the current product-level test map. Automated coverage lives in `tests/e2e/feature-checklist.spec.ts`, `tests/e2e/*.spec.ts`, `tests/api/route-smoke.test.ts`, `tests/tools`, `tests/mcp`, and `tests/evals`.

## Feature Tests

| Area | Coverage |
| --- | --- |
| Landing | Brand hero, feature grid, demo section, pricing section, sign-in/sign-up CTAs |
| Auth UI | Sign-in/sign-up Google buttons, email/password fields, no accidental form submission in smoke |
| Batch recording | Batch page renders, microphone button is present, upload drop zone is present |
| Live recording | Live page renders, start control and empty transcript state render without requesting mic permission |
| Live preflight | `/api/transcribe/stream/preflight` reports quota, provider, pricing, and runtime model readiness before a paid token is minted |
| Local recording drafts | Unit tests cover saving, reading, and clearing device-local live transcript drafts |
| Recorder voice commands | Unit tests cover "Hey Layers" wake phrases, remove-last commands, action-plan directives, custom note-writer instructions, and normal speech rejection |
| Recording reminders | Settings exposes 5/15/30 minute presets plus calendar-aware exact reminders; native builds use Capacitor Local Notifications and web falls back to browser notifications |
| Meetings | List page renders empty state or meeting links, detail tests skip cleanly when no completed meeting exists |
| Meeting intelligence | Completed meeting detail pages render note-first: Summary, Decisions, Actions, copyable notes package, Transcript, Chat, then collapsible cost details |
| Search | Search input accepts a query, safe empty-result handling works without provider calls |
| Chat | Empty state and prompt input render without sending model requests; completed-meeting chat has a local grounded fallback from saved notes/transcript when AI model credentials are unavailable |
| Settings | Summary/STT model selectors load defaults, persist safe local model changes, and show calendar reminders plus integration/webhook management with recent delivery status |
| Pricing | Free/Core/Pro plans render, subscription buttons exist without entering checkout in smoke |
| Pricing admin | `/admin/pricing` renders STT provider economics, 1,000-customer MRR/profit scenario, plan mix controls, provider lane recommendations, and save/activate version history |
| Quotas | Unit tests cover free meeting caps and paid monthly minute caps from the active admin pricing config |
| API routes | Manifest-driven smoke covers every route and avoids live vendor calls by using invalid/unauthenticated paths; behavior tests cover chat auth/local fallback, notes-package, webhook auth/validation, and delivery listing |
| Webhook delivery | Unit tests cover exact event matching, HMAC signatures, failed-delivery logging, and completed-meeting notes package payloads |
| AI tools | AI SDK tool registry and MCP tools have deterministic contract tests |
| Observability | `/observability`, `/api/observability/health`, and dev-kit status surfaces render |
| Navigation | Landing CTAs, app-shell slide menu, and TopBar back navigation are covered |
| Responsive/browser matrix | Playwright config supports mobile/tablet/desktop and light/dark projects; local fallback can use system Chrome |

## Local Browser Commands

```bash
PLAYWRIGHT_USE_SYSTEM_CHROME=1 PLAYWRIGHT_DISABLE_VIDEO=1 TEST_BASE_URL=http://localhost:3000 pnpm exec playwright test tests/e2e --project=desktop-dark
PLAYWRIGHT_USE_SYSTEM_CHROME=1 PLAYWRIGHT_DISABLE_VIDEO=1 TEST_BASE_URL=http://localhost:3000 pnpm exec playwright test tests/e2e/feature-checklist.spec.ts --project=desktop-dark
PLAYWRIGHT_USE_SYSTEM_CHROME=1 PLAYWRIGHT_DISABLE_VIDEO=1 TEST_BASE_URL=http://localhost:3000 pnpm exec playwright test tests/e2e/mobile-polish.spec.ts --project=mobile-light
pnpm test:api
pnpm test:contracts
pnpm test:tools
pnpm test:mcp
pnpm test:eval
```

For microphone capture itself, use Chrome, Safari, or the native Capacitor shell.
The Codex in-app browser is useful for UI verification but may not expose
`getUserMedia` recording.

For CI or a machine with Playwright browsers installed, omit the two `PLAYWRIGHT_*` fallback flags so the configured browser/video matrix runs normally.
