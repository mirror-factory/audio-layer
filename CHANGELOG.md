# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.39] — 2026-05-01

### Other
- MCP: implement Dynamic Client Registration (RFC 7591) (`a286d6d`)


## [0.1.38] — 2026-05-01

### Other
- Inner pages: Calendar + Settings sync as "Coming soon", MCP stays live (`5c4d54e`)


## [0.1.37] — 2026-05-01

### Other
- PROD-386: native app icon pipeline (iOS / Android / macOS / Windows) (`85768e3`)


## [0.1.36] — 2026-05-01

### Other
- MCP section: connection cycle animation + Anthropic orange + tagline (`944a102`)


## [0.1.35] — 2026-05-01

### Other
- Homepage: drop orphan stats, drop trust bar, flip MCP, center pricing (`26764ce`)


## [0.1.34] — 2026-05-01

### Other
- Web favicon: replace stock favicon.ico with the Layers aperture (`a17ff92`)


## [0.1.33] — 2026-05-01

### Other
- Fix(PROD-379): pass `next` to /auth/callback so Google OAuth lands on /record (`97d128b`)


## [0.1.32] — 2026-05-01

### Other
- Homepage v3: animated hero, real-time search/memory, restacked sections (`078ed32`)


## [0.1.31] — 2026-05-01

### Other
- chore: sync ai-starter manifests and test report outputs (`2044002`)


## [0.1.30] — 2026-05-01

### Documentation
- docs: add GETTING_STARTED entry point + platform brand SVGs on /download (`cbf0666`)


## [0.1.29] — 2026-05-01

### Other
- Document the dev → staging → main release flow (`abdad06`)


## [0.1.28] — 2026-05-01

### Other
- download: relabel all platforms to "Stable alpha" (`80fc31e`)


## [0.1.27] — 2026-05-01

### Other
- Homepage polish: ink banner, tighter hero, MCP-as-note (`fd51b30`)


## [0.1.26] — 2026-05-01

### Other
- Homepage: add MCP section with real brand logos, drop chip row + book a demo (`8f7abc4`)


## [0.1.25] — 2026-05-01

### Other
- Polish: disable Coming-soon CTAs, violet banner, lighter mint, hero rhythm (`970e2ce`)


## [0.1.24] — 2026-05-01

### Other
- Redesign public site with Paper Calm v1 + dark mode (`da8d4aa`)


## [0.1.23] — 2026-05-01

### Other
- Refresh public download and homepage routing (`cafa1c9`)


## [0.1.22] — 2026-05-01

### Other
- Hide calendar OAuth setup for now (`8d3e527`)


## [0.1.21] — 2026-05-01

### Other
- Regenerate iOS project in release workflow (`2652fed`)


## [0.1.20] — 2026-05-01

### Other
- Fix iOS release workflow sync (`6af9202`)


## [0.1.19] — 2026-05-01

### Other
- Update homepage and download release links (`19b162c`)


## [0.1.18] — 2026-05-01

### Fixed
- fix: handle read-only pricing config in serverless (`e07bfa6`)


## [0.1.17] — 2026-05-01

### Fixed
- fix: disable million compiler for production (`539ff1c`)


## [0.1.16] — 2026-05-01

### Other
- Polish Layers UI and live recording flows (`f694536`)


## [0.1.15] — 2026-04-30

### Testing
- test: refresh launch visual baselines (`f5f73fd`)


## [0.1.14] — 2026-04-30

### Added
- feat: prepare launch distribution (`8c36e4f`)


## [0.1.13] — 2026-04-30

### Other
- chore: update starter kit runtime (`7be90ae`)


## [0.1.12] — 2026-04-30

### Added
- feat: prepare launch readiness surfaces (`efaea52`)


## [0.1.11] — 2026-04-29

### Other
- chore: add release screenshots and feature matrix (`9407b49`)


## [0.1.10] — 2026-04-28

### Fixed
- fix: pass supabase secrets to deploy validation (`f6171ca`)


## [0.1.9] — 2026-04-28

### Other
- chore: retrigger ci with deployment secrets (`d74fb1e`)


## [0.1.8] — 2026-04-28

### Fixed
- fix: narrow append deprecation check (`a8b9c64`)


## [0.1.7] — 2026-04-28

### Fixed
- fix: remove stale assemblyai model alias (`467daed`)


## [0.1.6] — 2026-04-28

### Fixed
- fix: track dev-kit coverage route (`fb65911`)


## [0.1.5] — 2026-04-28

### Fixed
- fix: skip million check on dev cache (`2bae26b`)


## [0.1.4] — 2026-04-28

### Fixed
- fix: keep starter checks advisory in CI (`addeaf9`)


## [0.1.3] — 2026-04-28

### Fixed
- fix: make CI installs portable (`abcf24a`)


## [0.1.2] — 2026-04-28

### Fixed
- fix: keep optional pre-push checks nonblocking (`f7868ad`)


## [0.1.1] — 2026-04-28

### Fixed
- fix: align expect coverage with current cli (`197b0a5`)


## [Unreleased]

### Added

- **AI Starter Kit v0.0.11** — installed the current local package, added the new starter/control-plane routes, manifests, hooks, scripts, evidence flow, and Claude/Codex runtime configuration.
- **Claude MCP testing guide** — added `docs/CLAUDE_MCP_TESTING.md` with Claude.ai custom connector, Claude Code, OAuth, API-key, and MCP App preview instructions.
- **Claude MCP App UI** — added `show_meeting_dashboard` plus a `text/html;profile=mcp-app` resource so Claude can render a read-only interactive recent-meetings dashboard from the MCP server.
- **MCP OAuth hardening** — added consent, PKCE S256 auth codes, one-hour OAuth access tokens, rotating hashed refresh tokens, and token revocation for Claude-style MCP connectors.
- **Competitive landscape and GTM plan** — added `docs/COMPETITIVE_LANDSCAPE_AND_GTM.md` with current AI notetaker pricing, transcription provider economics, ICP selection, positioning, and a staged plan for 10, 100, and 1,000 paying customers.
- **Live recording preflight** — added `/api/transcribe/stream/preflight` plus recorder readiness checks for mic support, quota, provider configuration, active cost source, and runtime model status.
- **Local recording draft safety net** — live recording now mirrors transcript turns to local storage, keeps a device-local draft when autosave/finalize fails, and clears the draft after successful finalization.
- **Meeting intelligence panel** — completed meeting pages now surface decisions, intake signals, and next actions before transcript/chat.
- **Recording reliability docs** — `docs/RECORDING_RELIABILITY.md` documents the fast-start path, preflight contract, session states, local draft behavior, and browser testing caveats.
- **V1 execution plan** — `docs/V1_PLAN.md` defines the sprint order, API/tool/MCP/data/UI/native testing layers, optimization work, polish pass, and V1 definition of done.
- **Contract test foundation** — added API route inventory contracts, AI tool metadata/handler tests, and MCP protocol/tool tests with dedicated `test:contracts`, `test:tools`, and `test:mcp` scripts.
- **Runnable API smoke harness** — replaced the missing `start-server-and-test` dependency with `scripts/run-api-smoke.mjs`, added route behavior tests, and documented MCP/API testing in `docs/MCP_AND_API.md`.
- **Meeting detail chat** — completed meeting pages now include a meeting-scoped AI chat panel with Sales, Interview, and Standup templates grounded through `getMeetingDetails`.
- **App Store screenshot set** — added five editable marketing screenshots covering fast capture, private recording, intake notes, library chat, and provider-cost controls.
- **Release feature matrix** — added `docs/FEATURE_TEST_MARKETING_MATRIX.md` as the combined QA, feature inventory, screenshot asset, and marketing-pillar source of truth.
- **Current release screenshots** — added iPhone, iPad, and App Store benefit screenshot sets for the 2026-04-29 release pass.
- **Calendar OAuth setup** — added Google/Outlook connect, callback, disconnect, encrypted token storage, token refresh, and upcoming-event fetching for the home calendar panel.
- **Calendar-aware recording context** — live recordings now inherit the next calendar event title through token creation, autosave, finalize, and local drafts.
- **Calendar-aware recording reminders** — Settings can schedule recording reminders from fixed presets or from the next connected calendar event.
- **Unified Ask surface** — added `/ask` as the combined meeting-memory page for chat-style questions and exact search.
- **Mobile primary navigation** — added bottom navigation for Record, Library, and Ask on phone-sized layouts.
- **MCP notes push package** — added a read-only `prepare_notes_push` MCP tool that returns an explicit, destination-labeled notes payload without transmitting private notes.
- **Meeting notes package API/UI** — completed meetings now expose a copyable notes package built from the same shared source as MCP, with transcript inclusion kept opt-in.
- **Settings integrations panel** — added `/settings#integrations` with agent-access links, webhook registration, event selection, optional signing secrets, and delete controls.
- **Notes push workflow docs** — added `docs/NOTES_PUSH_WORKFLOW.md` to define the shared builder, safety rules, user component, API contract, and tests.
- **Webhook delivery visibility** — added recent delivery listing for user webhooks plus a Supabase migration for webhook destinations and delivery logs.
- **Local meeting chat fallback** — completed meeting chat can now answer from saved notes, actions, decisions, intake fields, and transcript segments when no AI model is configured.
- **Recorder voice commands** — live recording now recognizes "Hey Layers" commands, removes the last transcript segment on scratch/remove requests, and passes action-style commands as private note-generation directives.
- **MCP App visual polish** — updated the Claude MCP dashboard preview to use the current Layers pastel/glass visual language.

### Fixed

- **Recent recording cleanup** — tightened the home recent-recording rows, changed them to one consistent recording glyph with soft accent variants, and added a guarded delete action for empty zero-minute recordings.
- **Home palette/frame consistency** — rounded the full app frame, shortened the pastel backing surface, and softened the recorder ribbon ridges so the light home direction stays smoother.
- **Base live STT default** — made AssemblyAI Universal Streaming Multilingual the active $0.15/hr live default by removing automatic realtime diarization from pricing defaults and cost estimation.
- **Codex microphone confusion** — recorder errors now distinguish normal browser permission blocks from embedded-browser microphone limitations.
- **Recent recording status noise** — completed recordings no longer show redundant status text, while in-progress untitled recordings read as "Writing notes..." in the title.
- **MCP auth scoping** — removed module-level authenticated-user state from the MCP route so tool handlers close over the validated user for each request.
- **Default STT cost routing** — changed default batch STT to Universal-2 and default streaming STT to Universal Streaming, with shared defaults across settings, AssemblyAI resolution, and cost estimation.
- **Webhook event matching** — webhook delivery now matches the exact subscribed event and records failed fetch attempts in delivery logs.
- **Meeting chat auth** — valid chat requests now require an authenticated user instead of silently continuing as an anonymous chat session.

### Changed

- **UI audit polish loop** — captured desktop/mobile contact sheets, hid the dev toolbar from normal app UI, tightened mobile capture scale, made Settings model pricing readable, and softened Search/Chat language.
- **Desktop home layout** — changed the signed-in home screen to a three-column desktop layout, removed the quick-action buttons under the recorder, and dropped the confusing top status pills.
- **Second-concept app design** — applied the matte graphite/mint command-center direction across live recording, meeting library, semantic search, chat, transcript cards, reminders, and shared app chrome.
- **User-facing polish pass** — removed provider, cost, MCP, and debug-style wording from the main recording, meetings, search, and chat surfaces so the app reads like a polished meeting product instead of an engineering dashboard.
- **Mobile recording scale** — simplified the phone recording screen around one primary capture surface, a compact readiness summary, and notes only after speech starts.
- **Home recorder redesign** — replaced the signed-in home page's cluttered top card with a quieter recording dock, compact status, and lighter quick-action strip.
- **Public home hero redesign** — replaced the oversized landing hero with a calmer meeting-intake pitch, compact capture preview, tighter mobile scale, and clearer first action.
- **App-shell navigation** — replaced the user-facing hamburger with an account/settings gear; the drawer now stays focused on account items while admin/docs/roadmap/observability remain direct-URL operator surfaces.
- **Claude MCP App polish** — tightened the meeting dashboard UI, added standalone preview mode, and documented Supabase OAuth migration setup.
- **Meeting chat grounding** — meeting-scoped chat now includes transcript segment IDs and prompts the assistant to cite those segments when making factual claims.
- **Meeting chat resilience** — meeting-scoped chat now uses saved meeting context first and falls back to instant local answers instead of failing hard when model credentials are unavailable.
- **Pricing admin conversion labels** — the STT provider panel now shows 30-minute, Core-cap, and 1,000-user cost conversions for faster margin decisions.
- **Recorder atmosphere** — restored animated line visuals on the home and live recording screens, and removed reminder cards from the primary capture flow.
- **Paper Calm UI direction** — moved the default capture experience toward the selected light, soft-green direction with a simpler mobile recorder, warmer desktop backdrop, and calmer foreground cards.
- **Live desktop recording workspace** — active recording now shifts into a left capture panel with timer/details and a right live transcript panel, while shared app pages inherit the Paper Calm shell and transparent navigation.
- **Signed-in home copy** — replaced the oversized "Capture without ceremony" headline with a compact date/time treatment above the recorder.
- **Layers reference UI match** — refreshed the signed-in home shell to follow the supplied desktop/mobile screens with a rounded app frame, reference-style three-column desktop layout, calendar connect art, quieter recent recordings, and a procedural audio ribbon.
- **Layers reference detail polish** — softened the audio ribbon with larger edge fades and subtle dot/star texture, added animated dotted calendar orbit details, removed noisy recent-row play/readiness pills, flattened the recorder nav chrome, and matched desktop frame heights across the three-column home layout.
- **Home clock polish** — balanced the recorder card spacing and changed the primary clock to lighter typography with smaller live seconds.
- **Recorder ribbon motion** — increased the home ribbon's idle drift, ridge pulse, and breathing motion while keeping reduced-motion support.
- **Calendar event date tiles** — upcoming meetings on the home screen now show compact calendar-style date tiles beside each connected event.
- **Live workspace actions** — active recording now includes a meeting context card plus functional transcript, key point, action, decision, and question views generated from the live transcript.
- **Live recording workspace simplification** — tightened the active recording frame, narrowed the capture panel, moved timer/stop/live above the animated ribbon, simplified the context card, and flattened live transcript rows into a cleaner note stream.
- **Responsive home side panels** — compacted the calendar connect art at tablet/mobile widths and replaced colorful recent-recording icons with neutral duration/status markers.
- **Dark home palette alignment** — tuned the signed-in home dark mode to use a dimmed lilac/mint paper palette instead of a separate slate-blue scheme.
- **Home motion polish** — added restrained route/page entrance choreography and changed the home date label from a capsule into lighter, larger inline text.
- **Home illustration polish** — cleaned the recorder ribbon into a smoother organic three-line wave, added custom empty-state art for no recordings, and replaced the capture card icon badge with a lightweight contextual illustration.
- **Home desktop width cap** — constrained the signed-in home frame and wide-screen columns so the three-card layout holds its intended scale instead of stretching across large monitors.
- **Home recorder polish** — hid the idle recording timer, changed the ready microphone state to "Start recording", made stale zero-minute recent rows deletable with consistent duration markers, clarified the right-rail outcome card, and added smoother rail/capture transitions into live recording.
- **Note-first meeting detail** — meeting pages now put Summary, Decisions, and Actions before the transcript and chat, with cost details kept last.
- **Mobile navigation scope** — bottom navigation is limited to top-level Record, Library, and Ask surfaces so detail/settings pages stay focused.
- **Notes handoff architecture** — MCP, API, and meeting detail handoffs now share `lib/notes-push.ts` so future integrations do not fork package formatting.
- **Completed-meeting webhooks** — `meeting.completed` deliveries now include the compact notes package with summary, decisions, actions, and intake context while keeping transcript text out of webhook payloads.

## [0.3.0] — 2026-04-22

### Added

- **Vector embeddings** — auto-embed every meeting (transcript + summary + intake) into pgvector on completion
- **Hybrid search** — vector similarity + BM25 full-text + Reciprocal Rank Fusion for best-of-both results
- **HNSW index** — 15x faster queries than IVFFlat, handles inserts without rebuild
- **MCP server** — 6 tools (search, get meeting/transcript/summary, list, start recording) at POST /api/mcp
- **API key auth** — generate/view/revoke on profile page for MCP clients
- **Search UI** — /search page + search bar on /meetings page
- **Semantic search API** — POST /api/search with ranked results
- **Embedding cost tracking** — tracked in cost_breakdown alongside STT + LLM
- **ai-dev-kit v0.2.15** — api-routes registry, 9 slash commands, @code-reviewer subagent, 205 templates
- **docs/EMBEDDINGS_AND_SEARCH.md** — full technical documentation with research sources

### Architecture

- text-embedding-3-small (1536d) via AI Gateway — $0.00017 per 30-min meeting
- HNSW index with m=16, ef_construction=64 (2026 best practice over IVFFlat)
- Hybrid search: 70% semantic + 30% keyword via RRF (k=60)
- Auto-embed in after() callback — doesn't block API response
- tsvector + GIN index for BM25 keyword matching

---

## [0.2.0] — 2026-04-20

Complete ground-up rebuild on orphan branch with ai-dev-kit v0.2.4.

### Added

- **Landing page** — WebGL shader hero, auto-playing demo, bento feature grid, pricing preview
- **Live streaming transcription** — AssemblyAI v3 WebSocket with speaker diarization, audio-reactive shader visualization
- **Structured intake extraction** — IntakeFormSchema (budgets, timelines, decision makers, requirements, pain points)
- **Auth gate** — protected pages require email sign-in, home page works with anonymous auth
- **Roadmap page** — /roadmap with Now/Next/Later sections
- **Electron desktop shell** — main.js, preload.js, electron-builder.yml
- **Capacitor iOS/Android** — builds and launches in simulator
- **PDF export** — @react-pdf/renderer with full meeting data
- **95 unit tests** across 14 test files
- **68 Playwright e2e tests** across 6 viewport/theme projects
- **Pricing & billing doc** — complete Stripe setup guide, vendor pricing, margin analysis
- **Design system** — design-tokens.yaml, brand-guide.md, style-guide.md
- **WebGL shader** — Three.js chromatic wave lines, audio-reactive, state-driven animations

### Fixed

- AssemblyAI streaming: correct v3 WebSocket URL, message types, speech_model param
- AudioWorklet connected to destination (Chrome requires it for process() to fire)
- Magic link auth flow handles hash fragment tokens
- Edge middleware OTel compatibility (@opentelemetry/api as direct dep)
- Promptfoo evals routed through AI Gateway (no ANTHROPIC_API_KEY needed)

### Architecture

- Every API route wrapped with `withRoute()` (request IDs, structured logging, error handling)
- Every vendor SDK call wrapped with `withExternalCall()` (Langfuse spans)
- ai-dev-kit v0.2.4: hooks, dashboard, registries, enforcement gates
- Orphan branch — clean history, no retrofitting

## [0.1.0] — 2026-04-17

Initial prototype (archived on main, replaced by 0.2.0).
