# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
