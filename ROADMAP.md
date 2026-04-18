# audio-layer V1 Roadmap

Complete feature plan for shipping V1. Organized by priority tier.

---

## Platform Fixes (Ship-Blocking)

### P0-1: iOS status bar — white area above content
**Problem**: Capacitor WebView shows white background behind the status bar area on iOS. The dark app content starts below, creating a jarring white strip.
**Solution**: 
- Install `@capacitor/status-bar` plugin
- Set `StatusBar.setBackgroundColor('#0a0a0a')` on app init
- Set `StatusBar.setStyle('Dark')` for white text on dark bg
- Set `StatusBar.setOverlaysWebView(true)` for edge-to-edge
- CSS: body background-color matches `#0a0a0a` (neutral-950) so the bleed area is dark
- In `ios/App/App/Info.plist`, set `UIViewControllerBasedStatusBarAppearance` to `NO`

### P0-2: macOS Tauri — title bar should be transparent/overlay
**Problem**: Default Tauri title bar shows "audio-layer" text with standard macOS chrome. Competitors (Cursor, Linear) use transparent overlays where the app content extends behind the traffic lights.
**Solution**:
- In `tauri.conf.json`, set `titleBarStyle: "overlay"` on the window config
- This makes the title bar transparent — content renders behind the traffic lights
- Add a `data-tauri-drag-region` div at the top of the page for dragging
- CSS: `padding-top: 28px` on macOS to clear the traffic light area
- The app bg color fills the title bar area seamlessly

### P0-3: Swift runtime linking issue on Xcode 26
**Problem**: `libswift_Concurrency.dylib` not found at runtime — Swift 6.2 merged it into libswiftCore.
**Solution**: 
- Add a `build.rs` that emits the correct rpath for the system Swift libs
- OR pin `screencapturekit` crate to a version that doesn't require the standalone dylib
- OR add a post-build step that creates the symlink automatically

---

## Auth & Account (P1 — Required for launch)

### P1-1: Google OAuth sign-in
**What**: Add "Sign in with Google" button alongside email magic link.
**How**:
1. Supabase dashboard → Authentication → Providers → Enable Google
2. Create OAuth credentials in Google Cloud Console
3. Add Google client ID/secret to Supabase provider config
4. Add callback URL: `https://<app>.vercel.app/auth/callback`
5. Add button to `/sign-in` page calling `supabase.auth.signInWithOAuth({ provider: 'google' })`
**Effort**: Small (mostly config)

### P1-2: Account merge (anonymous → authenticated)
**What**: When an anonymous user signs in with email or Google, merge their existing meetings into the new account.
**How**:
1. Before sign-in, store current anonymous `user_id` in localStorage
2. After sign-in callback, call Supabase RPC to transfer meetings: `UPDATE meetings SET user_id = $new WHERE user_id = $old`
3. Uses service-role key (server-side only)
4. Delete the anonymous user after transfer
**Effort**: Medium

### P1-3: Email service (Resend)
**What**: Transactional emails — welcome, meeting summary digest, export delivery.
**How**:
1. `pnpm add resend`
2. Create `lib/email/client.ts` with Resend SDK init
3. Create email templates: welcome, meeting-ready, weekly-digest
4. Trigger from webhook/API routes
5. Env: `RESEND_API_KEY`
**Effort**: Medium (templates are the work)

---

## Core Features (P2 — V1 completeness)

### P2-0: Meeting detail chat + templates
**What**: Chat window on `/meetings/[id]` where users query the transcript with natural language. "What was the budget?" or "Rewrite as a sales brief." The AI restructures the display using typed output schemas.
**How**:
1. Add `useObject` (AI SDK) on the meeting detail page with `streamObject`
2. Define Zod schemas for different views: sales brief, action items, CRM card, interview debrief, standup notes
3. Pre-built **templates** as prompt presets:
   - Sales Discovery → extracts budget, timeline, decision makers, objections
   - Interview Debrief → key answers, red/green flags, next steps
   - Standup Notes → blockers, progress, plans
   - Custom → free-form query
4. API: `POST /api/meetings/[id]/chat` — streams structured output back
5. UI: Chat input below the transcript + template selector dropdown
6. The response replaces/augments the summary panel with the new structured view
7. Uses the user's selected summarization model from settings
**Why this matters**: This is the key differentiator — competitors show static summaries, we let users reshape the output. The MCP-ready structured data can flow into CRM, Notion, Slack, etc.
**Effort**: Medium-Large

### P2-1: Meeting search & filter
**What**: Search meetings by keyword, filter by date range and status.
**How**:
1. Add Supabase full-text search index on `meetings.text` column
2. API: `GET /api/meetings?q=keyword&from=date&to=date&status=completed`
3. UI: Search bar + date picker + status filter on `/meetings` page
4. Use PostgreSQL `to_tsvector` / `websearch_to_tsquery` for search
**Effort**: Medium

### P2-2: Observability dashboard wiring
**What**: Connect the placeholder `/observability` page to real data from `/api/ai-logs`.
**How**:
1. Fetch from `/api/ai-logs/stats` for aggregate tiles
2. Fetch from `/api/ai-logs` for recent calls table
3. Show: total calls, errors, avg latency, total cost, model distribution
4. Link to Langfuse dashboard when configured
**Effort**: Small

### P2-3: Auto-delete audio policy
**What**: Audio files are never stored long-term. AssemblyAI processes them and we discard.
**Current state**: Already correct — audio is uploaded to AssemblyAI for processing, we never persist the raw audio. AssemblyAI deletes audio after processing by default.
**To document**: Add privacy policy text, add UI indicator "Audio is processed and deleted — only transcripts are kept."
**Effort**: Trivial (documentation)

### P2-4: Transcript retention controls
**What**: Let users delete individual meetings and set auto-delete policies.
**How**:
1. Add "Delete meeting" button on `/meetings/[id]` (with confirmation)
2. API: `DELETE /api/meetings/[id]`
3. Settings: "Auto-delete transcripts after X days" (30/60/90/never)
4. Cron job to purge expired meetings
**Effort**: Medium

---

## Desktop Intelligence (P3 — Differentiator)

### P3-1: Auto-detect meetings on macOS
**What**: Detect when the user joins a meeting (Zoom, Google Meet, Teams, etc.) and prompt to start recording.
**How**:
- Monitor system audio activity via `cpal` or ScreenCaptureKit
- Detect known meeting app processes: `zoom.us`, `Google Chrome` (meet.google.com), `Microsoft Teams`, `Slack`, `FaceTime`
- Use macOS `NSWorkspace` notifications to detect app launches
- When a meeting app activates + mic/audio is active → show a notification/popup: "Meeting detected. Start recording?"
- The Tauri app runs as a menu bar item (persistent, lightweight)
- User clicks "Record" → starts ScreenCaptureKit system audio capture
**Platform**: macOS only (V1). Windows WASAPI loopback in V2.
**Effort**: Large

### P3-2: Menu bar mode (macOS)
**What**: Run as a menu bar app (like Granola) instead of a full window. Small persistent icon, click to expand.
**How**:
- Tauri supports system tray / menu bar via `tauri-plugin-positioner` 
- Minimal UI: status indicator, start/stop recording, recent meetings
- Full window opens on demand
**Effort**: Medium

### P3-3: System audio capture (already scaffolded)
**What**: Record the audio output of the computer (what comes through speakers/headphones) — captures the other side of the call.
**Current state**: Rust code exists but `extract_float_samples()` is a stub.
**How**: Implement the CMSampleBuffer → Float32 extraction in the ScreenCaptureKit handler.
**Effort**: Small (the hard part is done)

---

## Mobile Intelligence (P4 — Future)

### P4-1: Phone call recording (iOS)
**Reality check**: iOS does NOT allow recording native phone calls. Apple blocks mic access during cellular calls for privacy. This is a hard platform limitation.

**What's possible**:
- **VoIP calls only**: If the call goes through your app's VoIP stack (WebRTC/SIP), you control the audio and can record both sides.
- **Speakerphone workaround**: User puts call on speaker, app records via mic. Low quality, picks up ambient noise.
- **Contact integration**: Access contacts via `@capacitor/contacts`, initiate calls through the app's VoIP layer instead of native dialer.

**Realistic V1 approach**: 
- Add a "Record call" mode that captures mic audio while the user is on speakerphone
- Clearly label: "Place your call on speaker for best results"
- This is how Rev, Otter, and TapeACall work on iOS

**Effort**: Large (VoIP stack) or Medium (speakerphone mode)

### P4-2: Background recording (iOS)
**What**: Keep recording when the app is backgrounded.
**How**: 
- Info.plist: `UIBackgroundModes` → `audio` (already patched by setup.sh)
- Use AVAudioSession with `.playAndRecord` category
- Keep the audio session active in background
**Effort**: Small

---

## Feature Parity with Competitors

Based on Granola, Otter, Fireflies, Fathom (2026 landscape):

### What we have that they have
- [x] Real-time streaming transcription
- [x] Batch upload transcription
- [x] Speaker diarization
- [x] AI summary with key points, action items, decisions
- [x] PDF + Markdown export
- [x] Usage/cost tracking
- [x] Free tier with upgrade path
- [x] Bot-free capture (no meeting bot joins the call)

### What they have that we're missing

| Feature | Competitors | Priority | Effort |
|---|---|---|---|
| **CRM integration** | Fireflies, Otter | P3 | Large |
| **Calendar integration** | All | P2 | Medium |
| **Slack/Teams notifications** | Fireflies | P3 | Small |
| **Meeting templates** | Granola | P3 | Medium |
| **Custom vocabulary** | Otter, Fireflies | P3 | Small (AssemblyAI supports it) |
| **Cross-meeting AI search** | Otter, Fireflies | P2 | Large (vector DB) |
| **Real-time coaching/assist** | Fireflies (Sales Assist) | P4 | Large |
| **Meeting scheduling** | — | P4 | Medium |
| **Multi-language support** | Otter, Fireflies | P3 | Small (AssemblyAI supports 100+ languages) |
| **Team workspace** | All | P3 | Large |
| **Share meeting link** | All | P2 | Small |
| **Collaborative notes** | Granola | P3 | Large |
| **Video recording** | Fireflies | P4 | Large |

### Our differentiators
- **Multi-platform native**: Web + macOS + iOS from one codebase (competitors are web-only or single-platform)
- **System audio capture without a bot**: Granola does this too, but we're open about it
- **Structured intake extraction**: No competitor auto-extracts CRM-ready fields (budget, timeline, decision makers)
- **Model selection**: User picks their LLM (Claude, GPT, Gemini) — competitors are locked to one
- **Cost transparency**: Per-meeting cost breakdown shown to user
- **Self-hostable**: Can run against your own Supabase + API keys

---

## Implementation Order (Recommended)

### Week 1 — Ship-blocking fixes
1. P0-1: iOS status bar fix
2. P0-2: Tauri transparent title bar
3. P0-3: Swift runtime fix
4. P1-1: Google OAuth

### Week 2 — Account & core
5. P1-2: Account merge
6. P2-1: Meeting search
7. P2-2: Observability wiring
8. P2-4: Transcript retention/delete

### Week 3 — Polish & features
9. P1-3: Email service (Resend)
10. P2-3: Audio deletion policy docs
11. Share meeting link
12. Calendar integration (Google Calendar)

### Week 4 — Desktop intelligence
13. P3-3: System audio capture (finish stub)
14. P3-2: Menu bar mode
15. P3-1: Auto-detect meetings

---

## Env vars needed for new features

```bash
# Google OAuth (configured in Supabase dashboard, not in app env)
# — no new env vars needed

# Resend (transactional email)
RESEND_API_KEY=re_...

# Google Calendar (if implemented)
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
```

---

## Architecture decisions needed

1. **Vector DB for cross-meeting search**: Supabase pgvector (keep stack simple) vs Pinecone (better at scale)?
2. **Calendar integration**: Google Calendar API directly vs CalDAV (multi-provider)?
3. **Team workspaces**: Row-level security per org vs separate schemas?
4. **VoIP for call recording**: Build own WebRTC stack vs integrate with Twilio/Vonage?

---

*This roadmap covers everything from ship-blocking platform fixes through competitive feature parity. The current codebase handles the core pipeline well — the gaps are in platform polish, auth UX, and the intelligence layer that makes it a product vs a demo.*
