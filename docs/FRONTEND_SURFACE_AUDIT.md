# Frontend Surface Audit

Date: 2026-04-26

Purpose: keep the end-user app focused on fast meeting capture, search, chat, and usage clarity while preserving internal operations surfaces for development and admin work.

## Keep User-Facing

| Route            | Status | Reason                                    |
| ---------------- | ------ | ----------------------------------------- |
| `/`              | Keep   | Public pitch or signed-in fast start      |
| `/record/live`   | Keep   | Dedicated live recording path             |
| `/meetings`      | Keep   | Primary meeting library                   |
| `/meetings/[id]` | Keep   | Meeting detail, transcript, chat, exports |
| `/search`        | Keep   | Library retrieval                         |
| `/chat`          | Keep   | Cross-meeting assistant                   |
| `/settings`      | Keep   | Runtime model preferences                 |
| `/pricing`       | Keep   | Public plan explanation                   |
| `/usage`         | Keep   | Quotas, minutes, and limits               |
| `/profile`       | Keep   | Account and billing identity              |

## Internal Or Secondary

| Route            | Current treatment         | Reason                                         |
| ---------------- | ------------------------- | ---------------------------------------------- |
| `/admin/pricing` | Direct URL only           | Needed for pricing, margins, provider modeling |
| `/docs`          | Direct URL only           | Product documentation, not a customer workflow |
| `/roadmap`       | Direct URL only           | Planning page, not a customer workflow         |
| `/observability` | Direct URL only           | Operations/debugging page                      |
| `/dev-kit/*`     | Already outside main menu | Engineering dashboard                          |

## Navigation Change

`components/slide-menu.tsx` now keeps the gear drawer focused on account work:

- Profile
- Usage
- Plan
- Settings

Record, Meetings, Search, and Chat stay on the main app surface rather than inside the gear menu. Admin, docs, roadmap, observability, and dev-kit surfaces remain reachable by direct URL for operators, but they are not exposed in the normal app menu.

## Current Design Direction

The selected direction is the second generated concept: a matte graphite command surface with mint/teal operational accents. The first-run capture screen should feel more like a fast instrument panel than a marketing page:

- Public home leads with a concise meeting-intake offer, one primary action, and a compact capture preview rather than a large decorative brand hero.
- Live recording leads with a waveform, one-tap timer, friendly readiness checks, and autosave language that hides provider details.
- Meeting library, search, and chat use calm panels, compact chips, and clear note/search/action affordances.
- MCP and provider controls stay in admin, docs, or direct integration surfaces rather than competing with the primary recording workflow.
- Cards stay at 8px radius or smaller unless an existing control requires otherwise.
- Light mode should remain usable, but the premium product identity is dark graphite + mint.

## Public Home Hero

The signed-out `/` page should make the product understandable in the first few seconds:

- The headline sells the category: meeting intake, not generic audio intelligence.
- The wave remains as a subdued product asset, not the main content.
- The capture preview shows the desired behavior: tap once, start recording, then produce notes, decisions, and intake.
- Mobile should show the next section below the hero so the page does not feel like a dead end.

## Mobile Scale

Phone layouts should privilege capture speed over dashboard density:

- One primary recording surface appears above the fold.
- Readiness collapses to one compact status line on phones; detailed checks appear on larger screens.
- Empty notes are hidden on phones until speech starts, then the notes panel becomes the main content.
- Reminder controls stay secondary and horizontally scannable.
- Minimum touch targets stay near 44px, but explanatory copy is reduced before controls are hidden.

## Home Capture Surface

The signed-in home page should not repeat a meeting-title hero above the recorder. It should open as a recording dock:

- Top app chrome owns the product name; the capture area owns the mic, timer, waveform, and compact readiness.
- Quick actions use a lightweight strip instead of three heavy cards.
- The reminder stays below the primary recorder so it does not compete with the start action.
- Recent recordings are secondary and should not push the recorder below the first viewport.

## Market Read

Granola's obvious strengths are bot-free capture, blending user notes with transcripts, templates by meeting type, and turning notes into actions. Recent public reporting says Granola raised $125M at a $1.5B valuation and is expanding into Spaces, MCP, personal APIs, and enterprise APIs.

Layer One should not try to win by being another generic meeting notetaker. The stronger wedge is intake:

- Capture fast with nearly zero launch friction.
- Convert raw audio into structured library records.
- Make costs visible per meeting, provider, model, and plan.
- Push notes and extracted fields into tools through explicit triggers and MCP.
- Reduce downstream token spend by storing compact meeting facts, summaries, embeddings, and retrieval-ready sections instead of repeatedly sending full transcripts to large models.

## Next UX Improvements

1. Add a cold-start path that opens directly into a recording-ready state.
2. Add a provider bake-off page under admin that runs the same fixture across providers and records WER, diarization, latency, and cost.
3. Add a meeting intake schema editor so a team can define what a "good captured record" means.
4. Add a token-efficiency panel on meeting detail: full transcript tokens, compact memory tokens, retrieval chunks, and estimated LLM savings.
5. Add triggered note pushes: manual, after summary completion, after intake fields pass validation, or on tagged meeting types.
