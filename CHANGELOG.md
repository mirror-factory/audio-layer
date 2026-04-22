# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
