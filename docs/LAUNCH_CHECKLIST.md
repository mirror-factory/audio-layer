# Layers Launch Checklist

**Owner:** Alfonso + Codex launch swarm
**Last updated:** 2026-04-30
**Purpose:** Single launch checklist for product readiness, billing, transcription providers, web pages, native packaging, store submission, QA, and agent workstream assignment.

## Launch Definition

Launch means Layers is ready for real users to sign up, subscribe, record meetings, receive transcripts/summaries/actions, download the right app for their platform, and use the product without hidden setup gaps.

The launch target should be explicit before final release:

- [ ] Web-only launch
- [ ] Web + desktop beta
- [ ] Web + desktop + iOS TestFlight
- [ ] Web + desktop + iOS TestFlight + Android internal testing
- [ ] Full public launch across web, desktop, iOS, and Android

## Current Status

- [x] Public landing page exists.
- [x] Pricing page exists.
- [x] Download page exists.
- [x] Download page has Mac, Windows, iOS, Android, and web options.
- [x] Download page detects visitor platform and promotes the right install action.
- [x] Default summary/intake model is `anthropic/claude-haiku-4-5`.
- [x] Pricing economics default to Deepgram Nova-3 streaming with speaker diarization.
- [x] Deepgram pricing was refreshed on 2026-04-30.
- [x] Stripe checkout and webhook routes exist.
- [x] AssemblyAI batch and streaming transcription are implemented.
- [x] Deepgram and OpenAI transcription are in pricing metadata as adapter candidates.
- [ ] Deepgram is not implemented as a runtime provider.
- [ ] OpenAI Whisper/GPT transcription is not implemented as a runtime provider.
- [ ] Real App Store and Google Play listing URLs are not wired.
- [ ] Mac/Windows release URLs need final packaged artifacts.
- [ ] iOS release pipeline needs TestFlight/App Store archive flow.
- [ ] Android release pipeline needs signed AAB flow.
- [ ] Privacy, terms, and account deletion surfaces need final launch readiness.

## Critical Launch Decisions

- [ ] Confirm public product name: `Layers`.
- [ ] Confirm whether `Layer One` appears anywhere user-facing after launch.
- [ ] Confirm pricing tiers:
  - [ ] Free: `$0`
  - [ ] Core: `$15/month`
  - [ ] Pro: `$25/month`
- [ ] Confirm included usage:
  - [ ] Free: `25` lifetime meetings and `120` monthly minutes
  - [ ] Core: `600` monthly transcription minutes
  - [ ] Pro: `1,500` monthly transcription minutes
- [ ] Confirm whether Deepgram becomes the runtime default after adapter implementation.
- [ ] Confirm whether OpenAI transcription is needed for launch or can be post-launch.
- [ ] Confirm launch platforms and store release strategy.
- [ ] Confirm final support email.
- [ ] Confirm final privacy policy and terms ownership.

## Alfonso-Owned Setup

These items require account access, business verification, legal approval, or secrets.

### Stripe

- [ ] Create Stripe sandbox products for Core and Pro.
- [ ] Create Core recurring monthly price at `$15`.
- [ ] Create Pro recurring monthly price at `$25`.
- [ ] Provide `STRIPE_SECRET_KEY`.
- [ ] Provide `STRIPE_PRICE_CORE`.
- [ ] Provide `STRIPE_PRICE_PRO`.
- [ ] Create webhook endpoint: `/api/stripe/webhook`.
- [ ] Select webhook events:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] Provide `STRIPE_WEBHOOK_SECRET`.
- [ ] Repeat the same setup with live Stripe keys before production launch.

### Apple

- [ ] Confirm Apple Developer Program access.
- [ ] Confirm D-U-N-S / Dunn & Bradstreet setup is complete.
- [ ] Create or confirm App Store Connect app record.
- [ ] Confirm bundle ID.
- [ ] Confirm team ID.
- [ ] Approve app name, subtitle, description, keywords, and category.
- [ ] Approve privacy policy and terms URLs.
- [ ] Approve App Privacy nutrition answers.
- [ ] Approve screenshots and preview assets.

### Google Play

- [ ] Create Google Play Console developer account.
- [ ] Complete organization/developer verification.
- [ ] Create Play app record.
- [ ] Confirm package name.
- [ ] Choose Google Play app signing settings.
- [ ] Approve Data Safety answers.
- [ ] Approve screenshots, feature graphic, icon, short description, and full description.
- [ ] Provide final Google Play listing URL when available.

### Legal And Brand

- [ ] Approve privacy policy.
- [ ] Approve terms of service.
- [ ] Approve account deletion policy.
- [ ] Approve recording consent language.
- [ ] Approve support contact.
- [ ] Approve final launch copy.

## Codex-Owned Setup

These items can be handled by agents in the repo once account credentials or decisions are available.

- [ ] Wire Stripe env names and missing-env diagnostics.
- [ ] Add Stripe checkout integration tests.
- [ ] Add Stripe webhook integration tests.
- [ ] Add public `/privacy`.
- [ ] Add public `/terms`.
- [ ] Add account deletion route or in-app deletion flow.
- [ ] Add final App Store and Play Store URLs to `/download`.
- [ ] Add final Mac and Windows release URLs to `/download`.
- [ ] Add Deepgram runtime adapter.
- [ ] Add OpenAI transcription adapter if included in launch scope.
- [ ] Add final iOS privacy manifest.
- [ ] Add iOS archive/export/TestFlight workflow.
- [ ] Add Android signed release AAB workflow.
- [ ] Add release checklist to CI or docs.
- [ ] Run full verification and evidence export before launch.

## Agent Swarm Workstreams

Each agent should own a non-overlapping write scope. Agents should not edit each other workstream files without coordination.

### Agent 1: Competitive Positioning

**Write scope:** `docs/COMPETITIVE_LANDSCAPE_AND_GTM.md`, landing/pricing copy notes only.

- [ ] Produce Tana teardown.
- [ ] Compare Tana vs Layers: structured notes, meetings, graph, AI agents, capture.
- [ ] Identify what Layers should borrow, avoid, and differentiate.
- [ ] Produce concise homepage and pricing copy recommendations.

### Agent 2: Transcription Runtime Architecture

**Write scope:** `lib/settings-shared.ts`, provider architecture docs, provider type definitions.

- [ ] Map current AssemblyAI runtime path.
- [ ] Design provider abstraction for AssemblyAI, Deepgram, and OpenAI.
- [ ] Decide namespaced model IDs.
- [ ] Define settings migration path.
- [ ] Ensure adapter-needed models cannot appear in user settings.

### Agent 3: Deepgram Runtime Adapter

**Write scope:** new `lib/deepgram/*`, Deepgram route/client changes, focused tests.

- [ ] Install `@deepgram/sdk`.
- [ ] Add `DEEPGRAM_API_KEY` handling.
- [ ] Implement Deepgram client.
- [ ] Implement live streaming auth/session flow.
- [ ] Adapt live recorder WebSocket parsing for Deepgram results.
- [ ] Support Nova-3, Nova-3 multilingual, and Flux.
- [ ] Wire diarization/keyterm/redaction costs.
- [ ] Add tests for missing key, stream creation, finalization, and cost reporting.

### Agent 4: OpenAI Transcription Adapter

**Write scope:** new `lib/openai-transcription/*`, batch route changes, focused tests.

- [ ] Support `whisper-1`.
- [ ] Support `gpt-4o-mini-transcribe`.
- [ ] Support `gpt-4o-transcribe`.
- [ ] Document diarization limitations.
- [ ] Add batch fallback tests.
- [ ] Keep OpenAI models hidden until runtime support is complete.

### Agent 5: Model Defaults And Settings

**Write scope:** settings UI, model option tests, default docs.

- [ ] Confirm Claude Haiku 4.5 is the visible default everywhere.
- [ ] Ensure `DEFAULT_MODEL` env override still works.
- [ ] Separate runtime STT defaults from pricing economics defaults.
- [ ] Add UI labels for implemented vs candidate models where needed.
- [ ] Add tests that runtime defaults cannot point to adapter-needed providers.

### Agent 6: Stripe And Billing

**Write scope:** Stripe routes, billing docs, pricing config tests.

- [ ] Add checkout route integration tests.
- [ ] Add webhook route integration tests.
- [ ] Validate Supabase `profiles` billing columns.
- [ ] Confirm subscription tier sync.
- [ ] Improve missing-env errors.
- [ ] Decide whether pricing copy should move to shared config.

### Agent 7: Landing Page

**Write scope:** `app/landing.tsx`, landing CSS, landing docs/tests.

- [ ] Make sections blend into a continuous narrative.
- [ ] Keep waves organic and under the H1/workflow, not trapped behind boxes.
- [ ] Show workflow: calendar -> record -> transcript -> summary -> actions -> tools.
- [ ] Use recognizable app surfaces/icons thoughtfully.
- [ ] Verify desktop and mobile screenshots.

### Agent 8: Pricing Page

**Write scope:** `app/pricing/page.tsx`, pricing docs/tests.

- [ ] Align Free/Core/Pro copy with real quotas.
- [ ] Explain enhanced STT honestly.
- [ ] Add FAQ for minutes, privacy, integrations, and cancellation.
- [ ] Test checkout when logged out.
- [ ] Test checkout when signed in.

### Agent 9: Download Page

**Write scope:** `app/download/*`, download docs/tests.

- [ ] Replace placeholder iOS URL with final App Store or TestFlight URL.
- [ ] Replace placeholder Android URL with final Play Store or internal testing URL.
- [ ] Replace desktop fallback with final Mac/Windows release URLs.
- [ ] Add install requirements for macOS and Windows.
- [ ] Add stable/beta channel labeling.
- [ ] Re-run platform detection screenshot checks.

### Agent 10: Desktop Packaging

**Write scope:** `electron/*`, `electron-builder.yml`, release workflow docs.

- [ ] Confirm Electron app name and bundle ID.
- [ ] Confirm icon and app metadata.
- [ ] Build Mac DMG for Apple Silicon.
- [ ] Build Mac DMG for Intel if supported.
- [ ] Build Windows installer.
- [ ] Verify microphone/capture behavior.
- [ ] Plan macOS signing and notarization.
- [ ] Plan Windows code signing.

### Agent 11: iOS Release Readiness

**Write scope:** `ios/*`, Capacitor config, iOS release docs.

- [ ] Add `PrivacyInfo.xcprivacy`.
- [ ] Confirm microphone permission copy.
- [ ] Confirm display name.
- [ ] Confirm bundle ID.
- [ ] Confirm version and build number.
- [ ] Add archive/export workflow.
- [ ] Add TestFlight upload notes.
- [ ] Verify app on simulator and physical device if available.

### Agent 12: Android Release Readiness

**Write scope:** `android/*`, Android release workflow docs.

- [ ] Configure signed release AAB.
- [ ] Add keystore env documentation.
- [ ] Confirm package name.
- [ ] Confirm versionCode and versionName.
- [ ] Verify Android permissions.
- [ ] Check foreground service requirements for recording.
- [ ] Prepare Play internal testing build.

### Agent 13: Legal And Compliance

**Write scope:** legal pages, profile/account deletion, compliance docs.

- [ ] Add `/privacy`.
- [ ] Add `/terms`.
- [ ] Add account deletion page or in-app flow.
- [ ] Add data retention explanation.
- [ ] Add recording consent language.
- [ ] Add support contact.
- [ ] Verify Apple account deletion requirement.
- [ ] Verify Google Play user data policy readiness.

### Agent 14: QA And Release Evidence

**Write scope:** tests, evidence docs, release report.

- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Run `npx eslint .`.
- [ ] Run `npx ai-dev-kit tool validate`.
- [ ] Run `pnpm gates`.
- [ ] Run browser proof against launch routes.
- [ ] Capture desktop and mobile screenshots.
- [ ] Test Stripe sandbox checkout.
- [ ] Test AssemblyAI recording.
- [ ] Test Deepgram only after adapter is complete.
- [ ] Test packaged desktop builds.
- [ ] Test iOS and Android builds.
- [ ] Export launch evidence bundle.

## Launch Gates

### Gate 1: Product Surface

- [ ] Landing page approved.
- [ ] Pricing page approved.
- [ ] Download page approved.
- [ ] Sign in/sign up flows approved.
- [ ] Record flow approved.
- [ ] Meeting detail/summary flow approved.
- [ ] Settings/profile flow approved.
- [ ] Mobile layouts approved.

### Gate 2: Money

- [ ] Stripe sandbox checkout works.
- [ ] Stripe webhook syncs subscription state.
- [ ] Core price ID is set.
- [ ] Pro price ID is set.
- [ ] Supabase `profiles` billing columns work.
- [ ] Quota behavior matches plan.
- [ ] Cancellation/downgrade behavior is understood.
- [ ] Live Stripe keys are ready before production launch.

### Gate 3: Recording And AI

- [ ] AssemblyAI batch transcription works.
- [ ] AssemblyAI live transcription works.
- [ ] Summary generation works with Claude Haiku 4.5.
- [ ] Intake/actions extraction works.
- [ ] Search works on completed meetings.
- [ ] Meeting chat works.
- [ ] Provider costs are recorded.
- [ ] Deepgram runtime is either complete or explicitly post-launch.

### Gate 4: Native Builds

- [ ] Mac build installs.
- [ ] Windows build installs.
- [ ] iOS build runs.
- [ ] Android build runs.
- [ ] Native permissions are clear.
- [ ] Download URLs point to real artifacts or store pages.
- [ ] Version numbers are consistent.

### Gate 5: Store Compliance

- [ ] Privacy policy exists.
- [ ] Terms exist.
- [ ] Account deletion path exists.
- [ ] App Store privacy nutrition is complete.
- [ ] Google Play Data Safety is complete.
- [ ] iOS privacy manifest exists.
- [ ] Recording consent language is present.
- [ ] Support URL/email is present.

### Gate 6: QA Evidence

- [ ] Typecheck passes.
- [ ] Tests pass.
- [ ] ESLint has no errors.
- [ ] Tool validation passes.
- [ ] Gates pass.
- [ ] Browser proof passes or exceptions are documented.
- [ ] Launch screenshots are captured.
- [ ] Release report is written.

## Recommended Swarm Order

1. Legal/compliance pages and account deletion.
2. Stripe sandbox verification and route tests.
3. Landing, pricing, and download final copy/UI.
4. Desktop artifact URLs and packaging.
5. iOS TestFlight readiness.
6. Android internal testing readiness.
7. Deepgram runtime adapter.
8. OpenAI transcription fallback if still in launch scope.
9. Full QA/evidence pass.
10. Production env and launch report.

## Launch-Day Checklist

- [ ] Freeze launch branch.
- [ ] Confirm no unrelated dirty changes are included.
- [ ] Confirm production env vars in Vercel.
- [ ] Confirm Stripe live mode keys and webhook.
- [ ] Confirm Supabase production schema.
- [ ] Confirm provider API keys.
- [ ] Confirm `/`, `/pricing`, `/download`, `/sign-in`, `/sign-up`, `/record`, and `/settings` load.
- [ ] Run a real recording.
- [ ] Generate a summary and actions.
- [ ] Run a paid checkout in live/test mode as appropriate.
- [ ] Confirm support email works.
- [ ] Confirm app download links work.
- [ ] Capture final launch screenshots.
- [ ] Create launch tag.
- [ ] Publish release notes.
- [ ] Monitor logs, Stripe events, provider usage, and signup funnel.

## Post-Launch Watchlist

- [ ] Stripe webhook failures.
- [ ] Failed recordings.
- [ ] Provider cost spikes.
- [ ] Quota false positives.
- [ ] Sign-in errors.
- [ ] Mobile layout regressions.
- [ ] App Store / Play review feedback.
- [ ] Users confused by minutes or plans.
- [ ] Users asking for calendar, Gmail, Outlook, Slack, Linear, Notion, or MCP setup.
- [ ] Users requesting Deepgram/OpenAI transcription quality options.
