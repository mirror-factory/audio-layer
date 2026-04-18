# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.35] — 2026-04-18

### Added
- feat: Resend email integration + Google OAuth button + verified AssemblyAI models (`e26e545`)


## [0.1.34] — 2026-04-18

### Fixed
- fix: streaming model validation — u3-rt is not a valid AssemblyAI model (`389eff0`)


## [0.1.33] — 2026-04-18

### Added
- feat: use newest models (GPT-5.4 Nano, Gemini 3.1) + add meeting chat to roadmap (`e110cbb`)


## [0.1.32] — 2026-04-18

### Added
- feat: dynamic model list from Vercel AI Gateway with live pricing (`600a859`)


## [0.1.31] — 2026-04-18

### Fixed
- fix: defensive handling for chat route — validate messages before convertToModelMessages (`823f748`)


## [0.1.30] — 2026-04-18

### Fixed
- fix: add .vercelignore (exclude 2.4GB Tauri target) + correct titleBarStyle casing (`5b29125`)


## [0.1.29] — 2026-04-18

### Fixed
- fix: native shell transcription — iOS codec fallback + AssemblyAI WebSocket (`e19cc8d`)


## [0.1.28] — 2026-04-18

### Fixed
- fix: transparent Tauri titlebar + iOS status bar dark mode (`49e423b`)


## [0.1.27] — 2026-04-18

### Added
- feat: update model options with latest pricing from all providers (`61dd895`)


## [0.1.26] — 2026-04-18

### Documentation
- docs: comprehensive V1 roadmap — platform fixes, auth, features, competitive analysis (`917067e`)


## [0.1.25] — 2026-04-18

### Added
- feat: always-visible nav bar + comprehensive design system spec (`6c428ea`)


## [0.1.24] — 2026-04-18

### Added
- feat: fix Tauri compile errors, add iOS safe areas and bottom nav bar (`c02497d`)


## [0.1.23] — 2026-04-18

### Documentation
- docs: rewrite README as single-page index pointing to all docs (`016fd4d`)


## [0.1.22] — 2026-04-18

### Documentation
- docs: handoff package — ARCHITECTURE, API, COSTS, OPERATIONS, PLATFORMS (`e8de922`)


## [0.1.21] — 2026-04-18

### Added
- feat: Tauri macOS system audio + Capacitor setup + PWA manifest (`bbee798`)


## [0.1.20] — 2026-04-18

### Other
- Merge remote-tracking branch 'origin/main' into claude/research-vercel-ai-starter-AbOFX (`aa9cd5f`)


## [0.1.19] — 2026-04-17

### Added
- feat: add settings page for picking AssemblyAI and summarization models (`ff6c20b`)


## [0.1.18] — 2026-04-17

### Fixed
- fix: migrate AssemblyAI from deprecated speech_model to speech_models array (`38c3a35`)


## [0.1.17] — 2026-04-17

### Documentation
- docs: SETUP.md — complete env + deploy guide (`80ecd34`)


## [0.1.16] — 2026-04-17

### Documentation
- docs: VERIFICATION_GAPS.md — what's NOT verified end-to-end (6/6) (`d11f7e5`)


## [0.1.15] — 2026-04-17

### Added
- feat: Capacitor mobile shell scaffold (5/6) (`056d75e`)


## [0.1.14] — 2026-04-17

### Added
- feat: native mic capture via cpal + Tauri-aware LiveRecorder (4/6) (`751c7c0`)


## [0.1.13] — 2026-04-17

### Added
- feat: paywall — 25 free meetings, then upgrade gate (3/6) (`e701ea2`)


## [0.1.12] — 2026-04-17

### Added
- feat: PDF export via @react-pdf/renderer (2/6) (`763f65f`)


## [0.1.11] — 2026-04-17

### Added
- feat: email magic-link auth + /profile (1/6) (`eecba5b`)


## [0.1.10] — 2026-04-17

### Added
- feat: Tauri 2.x desktop scaffold (5/5) (`9675677`)


## [0.1.9] — 2026-04-17

### Added
- feat: pricing page + Stripe checkout/webhook (4/5) (`ae1c992`)


## [0.1.8] — 2026-04-17

### Added
- feat: intake-form extraction (3/5) (`0758a8c`)


## [0.1.7] — 2026-04-17

### Added
- feat: markdown export for /meetings/[id] (2/5) (`2073486`)


## [0.1.6] — 2026-04-17

### Added
- feat: anonymous Supabase auth + RLS-scoped meetings (1/5) (`b1fab86`)


## [0.1.5] — 2026-04-17

### Added
- feat: streaming transcription (u3-rt-pro) + /record/live (`017e7a6`)


## [0.1.4] — 2026-04-17

### Added
- feat: meetings persistence + list/detail views (MeetingsStore) (`d770aac`)


## [0.1.3] — 2026-04-17

### Added
- feat: V1 transcription pipeline — AssemblyAI batch + Gateway summary (`49d73e4`)


## [0.1.2] — 2026-04-17

### Other
- chore: lock product stack — AssemblyAI U-3 Pro, Capacitor, Tauri (`b8fdec2`)


## [0.1.1] — 2026-04-17

### Fixed
- fix: break infinite loop in post-commit auto-version hook (`1cd3010`)


## [Unreleased]

### Added
- Initial project setup

## [0.0.1] — 2026-01-01

### Added
- Project scaffolded from Vercel AI Starter Kit
- AI SDK v6 chat route with tool support
- Supabase authentication and database
- Basic test infrastructure (Vitest)
