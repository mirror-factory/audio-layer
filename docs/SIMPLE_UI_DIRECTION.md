# Simple UI Direction

Date: 2026-04-27

## Goal

Layers should feel like a recorder first and a workspace second. The user opens the app to start a meeting quickly, then returns later to search, ask, organize, export, or automate.

## Research Notes

- Granola separates "coming up", notes, spaces/folders, chat, and settings instead of placing everything on the first screen: https://docs.granola.ai/help-center/getting-started/granola-101
- Granola's MCP is an integration layer for external AI tools, not a primary app surface: https://docs.granola.ai/help-center/sharing/integrations/mcp
- Notion AI Meeting Notes can start from `/meet`, calendar detection, or calendar context, and saves transcript, summary, decisions, and action items into the workspace: https://www.notion.com/en-US/product/ai-meeting-notes
- Fathom emphasizes shared source of truth, search, action items, and automatic tool sync after the meeting: https://www.fathom.ai/
- Otter separates live meeting chat, AI channels, answers, collaboration, and generated content as chat layers: https://otter.ai/chat

## Product Simplification

Primary surface:

- Start recording
- Recording state
- Current or next meeting context
- Upcoming calendar meeting context when connected
- Local draft/recovery status only when needed

Secondary surfaces:

- Library of meetings
- Meeting detail
- Ask/search across meetings
- Account, plan, usage, settings

Stored away:

- Provider/model pricing details live in admin/settings advanced panels.
- MCP setup lives in settings/integrations and docs, not the main app.
- Debug, observability, dev-kit, pricing admin, and provider bake-off pages stay direct URL or operator-only.
- Automation triggers live inside a meeting detail or integration settings drawer.

## Screen Concepts

The mockups are in `docs/design/simple-ui-concepts.html`.

Generated screenshots:

- `output/design/simple-ui/desktop-capture.png`
- `output/design/simple-ui/desktop-library.png`
- `output/design/simple-ui/mobile-capture.png`
- `output/design/simple-ui/mobile-note.png`

## IA Recommendation

Top-level user navigation should be:

1. Record
2. Library
3. Ask

Everything else is under Account/Settings:

- Plan
- Usage
- Models
- Integrations
- MCP
- Notifications

## Design Rules

- One primary action per screen.
- No repeated CTAs.
- No pricing, provider, model, MCP, or debug vocabulary on capture screens.
- Notes are note-first, transcript-second.
- Chat is a drawer or tab, not a permanent panel.
- Mobile uses bottom navigation and bottom sheets.
- Desktop uses a quiet rail and an optional inspector drawer.
- Use mint only for active recording, primary action, selected nav, and confirmation.

## Next Build Step

Implement this direction in the real app by simplifying the signed-in home first:

1. Replace the current public hero with a simpler marketing landing only for signed-out users.
2. Make signed-in `/` a minimal record screen.
3. Combine `/search` and `/chat` into one "Ask" surface.
4. Move reminders, usage, providers, and integrations into Settings drawers.
5. Keep `/meetings` as the full library and `/meetings/[id]` as the note-first detail view.

## UI Polish Audit - 2026-04-27

Screenshot set:

- Before: `output/ui-audit/before/contact-sheet.png`
- After: `output/ui-audit/after/contact-sheet.png`

Immediate fixes:

1. Remove the Vercel/dev toolbar from the normal app experience unless explicitly enabled.
2. Keep the home capture screen above the fold on phones by tightening the headline, waveform, and primary start control.
3. Make Settings model and pricing choices readable on mobile by separating the selected provider label from price details.
4. Make Chat and Search use product language instead of technical assistant/debug language.
5. Keep provider, MCP, pricing-admin, and model-cost details out of the main capture flow.

Next pass:

1. Connected calendar events now prefill recording title and meeting context.
2. `/ask` now combines the Ask and Find workflows into one meeting-memory surface.
3. Mobile now has primary Record, Library, and Ask navigation on the top-level surfaces only.
4. Reminder controls now live in Settings with optional calendar-aware reminder shortcuts.
5. Meeting detail is now note-first: Summary, Decisions, Actions, Transcript, Chat.
6. Completed-meeting chat now has an instant local fallback from saved notes and transcript so the detail page stays useful even before model credentials are configured.
