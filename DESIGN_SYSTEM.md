# audio-layer Design System & UI Spec

Complete specification for every view, component, token, and interaction pattern. Built for handoff to a design agent or tool (Claude Design, Figma, etc.) to produce the full V1 interface.

---

## 1. Design Tokens

### 1.1 Color Palette

**Primary accent: Mint**

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `mint-50` | `#f0fdfa` | — | subtle backgrounds |
| `mint-100` | `#ccfbf1` | — | hover states |
| `mint-200` | `#99f6e4` | — | badges, chips |
| `mint-300` | `#5eead4` | — | secondary elements |
| `mint-400` | `#2dd4bf` | `#2dd4bf` | primary accent |
| `mint-500` | `#14b8a6` | `#14b8a6` | buttons, active states |
| `mint-600` | `#0d9488` | — | pressed states |
| `mint-700` | `#0f766e` | — | borders on accent |
| `mint-900` | `#134e4a` | `#134e4a` | accent backgrounds |

**Neutral palette (dark mode primary)**

| Token | Value | Usage |
|---|---|---|
| `neutral-950` | `#0a0a0a` | page background |
| `neutral-900` | `#171717` | card backgrounds |
| `neutral-800` | `#262626` | borders, dividers |
| `neutral-700` | `#404040` | secondary borders |
| `neutral-600` | `#525252` | disabled text |
| `neutral-500` | `#737373` | muted text, labels |
| `neutral-400` | `#a3a3a3` | body text (secondary) |
| `neutral-300` | `#d4d4d4` | body text (primary) |
| `neutral-200` | `#e5e5e5` | headings |
| `neutral-100` | `#f5f5f5` | titles, emphasis |
| `neutral-50` | `#fafafa` | high contrast text |

**Semantic colors**

| Token | Dark Mode | Usage |
|---|---|---|
| `success` | `#22c55e` (green-500) | completed, active subscription |
| `error` | `#ef4444` (red-500) | errors, destructive actions |
| `warning` | `#eab308` (yellow-500) | degraded state, limits |
| `info` | `#3b82f6` (blue-500) | user messages in chat |

### 1.2 Typography

| Style | Font | Size | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| `display` | SF Mono | 32px / 2rem | 600 | 1.2 | page hero titles |
| `heading-lg` | SF Mono | 24px / 1.5rem | 600 | 1.3 | section headings |
| `heading-md` | SF Mono | 18px / 1.125rem | 600 | 1.4 | card titles |
| `heading-sm` | SF Mono | 14px / 0.875rem | 600 | 1.4 | sub-headings |
| `body` | SF Mono | 14px / 0.875rem | 400 | 1.6 | main content |
| `body-sm` | SF Mono | 12px / 0.75rem | 400 | 1.5 | secondary content |
| `caption` | SF Mono | 10px / 0.625rem | 500 | 1.4 | labels, badges |
| `label` | SF Mono | 11px / 0.6875rem | 500 | 1.3 | uppercase tracking labels |
| `mono-code` | SF Mono | 13px / 0.8125rem | 400 | 1.5 | code, JSON, IDs |

Font stack: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`

### 1.3 Spacing Scale

Base unit: 4px. All spacing, padding, margin, and gaps use multiples.

| Token | Value | Common usage |
|---|---|---|
| `space-1` | 4px | icon-to-label gap |
| `space-2` | 8px | inline element gaps |
| `space-3` | 12px | list item padding |
| `space-4` | 16px | card inner padding (mobile) |
| `space-5` | 20px | between form fields |
| `space-6` | 24px | card inner padding (desktop) |
| `space-8` | 32px | section spacing |
| `space-10` | 40px | page top/bottom padding |
| `space-12` | 48px | between major sections |
| `space-16` | 64px | reserved for nav bar height |

### 1.4 Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 6px | buttons, inputs, chips |
| `radius-md` | 8px | small cards, tool cards |
| `radius-lg` | 12px | chat messages |
| `radius-xl` | 16px | page cards |
| `radius-2xl` | 24px | hero sections |
| `radius-full` | 9999px | pills, tab bar buttons |

### 1.5 Elevation / Shadows

| Level | Shadow | Usage |
|---|---|---|
| `elevation-0` | none | flat elements |
| `elevation-1` | `0 1px 2px rgba(0,0,0,0.3)` | cards |
| `elevation-2` | `0 4px 16px rgba(0,0,0,0.4)` | dropdowns, popovers |
| `elevation-3` | `0 24px 60px rgba(0,0,0,0.5)` | modals |
| `elevation-accent` | `0 24px 60px rgba(16,185,129,0.15)` | highlighted card (Pro tier) |

### 1.6 Motion

| Property | Duration | Easing | Usage |
|---|---|---|---|
| `transition-fast` | 100ms | ease-out | hover states |
| `transition-normal` | 200ms | ease-in-out | tab switches, toggles |
| `transition-slow` | 300ms | ease-in-out | page transitions |
| `pulse` | 1.5s repeat | ease-in-out | recording indicator |
| Respect `prefers-reduced-motion: reduce` | — | — | disable animations |

---

## 2. Component Registry

Every component in the system, its variants, states, and where it's used.

### 2.1 Navigation

#### NavBar (Bottom Tab Bar)
- **Type**: Client component, fixed position
- **Platforms**: All (web, iOS, macOS)
- **Tabs**: Home, Record, Meetings, Chat, Settings
- **States**: `default` | `active`
- **Active indicator**: mint-400 icon + label
- **Inactive**: neutral-500
- **Touch target**: 44px minimum (iOS HIG)
- **Background**: neutral-900, border-t neutral-800
- **Safe area**: `pb-[env(safe-area-inset-bottom)]`
- **Used on**: Every page

#### PageHeader
- **Type**: Server component
- **Props**: `title: string`, `backHref?: string`, `backLabel?: string`
- **Renders**: Title (left) + back link (right)
- **Default back**: "← Hub" linking to `/`
- **Used on**: All sub-pages except chat (has its own header)

### 2.2 Recording

#### AudioRecorder
- **Type**: Client component
- **States**: `idle` | `recording` | `error`
- **idle**: "Start recording" button (mint-500, rounded-full, 44px height)
- **recording**: "Stop" button (red-500) + elapsed time MM:SS + pulsing dot
- **error**: Error alert with microphone permission message
- **Touch target**: 44px
- **Used on**: `/record`

#### LiveRecorder
- **Type**: Client component
- **States**: `idle` | `starting` | `live` | `stopping` | `error`
- **idle**: "Start live recording" button
- **starting**: Spinner + "Connecting..."
- **live**: Stop button + elapsed time + LiveTranscriptView
- **stopping**: "Saving..." spinner
- **error**: Error alert with retry button
- **Used on**: `/record/live`

#### LiveTranscriptView
- **Type**: Client component
- **Props**: `turns: LiveTurn[]`, `partial?: LiveTurn`
- **Renders**: Speaker-labeled turns scrolling in real-time
- **Partial turn**: dimmed text with typing indicator
- **Auto-scroll**: Anchored to bottom

### 2.3 Meeting Display

#### MeetingListItem
- **Type**: Link component
- **Props**: `meeting: MeetingListItem`
- **Renders**: Title, date, duration, status chip
- **Status chip variants**: `completed` (green), `processing` (yellow pulse), `error` (red)
- **Touch target**: Full row, 48px minimum height
- **Used on**: `/meetings`

#### TranscriptView
- **Type**: Server component
- **Layout**: Two-column on desktop (transcript left, summary right), stacked on mobile
- **Left column**: Speaker-labeled utterances with timestamps
- **Right column / below**: Summary card with title, body, key points, action items, decisions
- **Used on**: `/meetings/[id]`

#### IntakeFormView
- **Type**: Server component
- **Props**: `intake: IntakeForm`
- **Renders**: Grid of labeled fields (intent, participant, org, budget, timeline, etc.)
- **Empty fields**: Show "—" in neutral-600
- **Used on**: `/meetings/[id]`

#### MeetingCostPanel
- **Type**: Server component
- **Layout**: 3-column grid (STT, LLM, Total)
- **Each tile**: Label (caption), value (heading-lg), detail text (body-sm)
- **LLM calls table**: Model, tokens, cost per call
- **Used on**: `/meetings/[id]`

#### MeetingDetailPoller
- **Type**: Client component
- **Purpose**: Polls `/api/transcribe/[id]` until completed/error
- **Renders**: Processing spinner with status text
- **Used on**: `/meetings/[id]` when status !== completed

### 2.4 Chat

#### ChatMessage
- **Type**: Client component
- **Variants**:
  - `user`: blue-600 background, white text, right-aligned
  - `assistant`: neutral-900 background, neutral-100 text, left-aligned
- **Parts**: Text, reasoning (collapsible), tool invocations
- **Tool rendering**: Uses TOOL_BY_NAME registry for labels, ToolCard for display
- **Silent tools**: Hidden via SILENT_TOOLS set
- **Used on**: `/chat`

#### ChatInput
- **Type**: Client component
- **Renders**: Auto-expanding textarea + send button
- **States**: `idle` | `loading` (disabled)
- **Keyboard**: Enter to send, Shift+Enter for newline
- **Used on**: `/chat`

#### ToolCard
- **Type**: Client component
- **States**: `input-streaming` | `input-available` | `output-available` | `output-error`
- **Header**: Tool label + state indicator (spinner/checkmark/error icon)
- **Body**: Collapsible input JSON, children slot, collapsible output JSON
- **Used on**: `/chat` (via ChatMessage)

### 2.5 Forms & Settings

#### Select (Model Picker)
- **Type**: Client component
- **Props**: `value`, `options: {value, label}[]`, `onChange`
- **Styling**: Full-width, neutral-900 bg, neutral-700 border, focus:mint-500 border
- **Used on**: `/settings`

#### StatusBadge
- **Type**: Client component
- **Variants**: `saving` (neutral), `saved` (mint), `error` (red)
- **Used on**: `/settings`

### 2.6 Billing & Pricing

#### PricingCard
- **Type**: Server component
- **Variants**: `free` | `core` | `pro`
- **Pro highlight**: mint-700 border + accent shadow
- **Content**: Name, price, period, blurb, feature list with checkmarks, CTA button
- **CTA variants**: "Start recording" (outline) for free, "Subscribe" (filled) for paid
- **Used on**: `/pricing`

#### UsageTile
- **Type**: Server component
- **Layout**: Label (caption uppercase), value (heading-lg), subtitle (body-sm)
- **Used on**: `/usage`

### 2.7 Shared Patterns

#### ErrorAlert
- **Styling**: `rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-300`
- **Used on**: Multiple pages for error states

#### ProgressIndicator
- **Recording**: Pulsing mint-400 dot + status text
- **Processing**: Spinner (border-2, animate-spin) + status text
- **Never full-screen blocking** (iOS HIG)

#### StatusChip
- **Variants**: completed (green), processing (yellow), error (red), queued (neutral)
- **Size**: `text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full`

#### EmptyState
- **Pattern**: Icon + title + description + CTA button
- **Used when**: No meetings, no recordings

---

## 3. View Specifications

### 3.1 Home / Hub (`/`)

**Purpose**: Central navigation dashboard. Shows app overview + quick links.

**Layout**:
- Full-width mint gradient header with app name, version badge
- Navigation button grid: Record, Meetings, Chat, Pricing, Usage, Profile, Settings, Observability
- Stats row: Tools count, Custom UI count, Interactive count, Silent count
- Content sections: User flow, Routes, Registry model, Verification

**Mobile**: Stack buttons 2-across, full-width sections

**Elements**:
| Element | Component | Props/Config |
|---|---|---|
| Hero header | Custom | Rounded-2xl, mint gradient border/shadow |
| Nav buttons | Link pills | Filled (mint) for primary, outline for secondary |
| Stat cards | StatCard | 4-column grid, neutral-900 bg |
| Sections | Section | Rounded-3xl, neutral-950 bg |
| Bottom nav | NavBar | Home tab active |

---

### 3.2 Record (`/record`)

**Purpose**: Upload audio file or record from mic for batch transcription.

**Layout**:
- PageHeader: "Record" + "← Hub"
- Sub-nav links: "Live mode", "All meetings"
- AudioRecorder component (centered)
- File upload drop zone / button
- Status area (processing indicator or error)

**States**:
1. **idle**: Recorder + upload visible
2. **uploading**: Progress bar + "Uploading..."
3. **processing**: Spinner + "Transcribing... this may take 10-30 seconds"
4. **error**: ErrorAlert with message
5. **complete**: Auto-redirect to `/meetings/[id]`

**Mobile**: Full-width, large touch targets, record button prominent

**Elements**:
| Element | Component | Interaction |
|---|---|---|
| Record button | AudioRecorder | Tap to start/stop |
| Upload button | `<input type="file">` | Tap to select |
| Live mode link | Link | Navigate to `/record/live` |
| Progress | ProgressIndicator | Shown during upload/transcribe |
| Error | ErrorAlert | Dismissable |
| Bottom nav | NavBar | Record tab active |

---

### 3.3 Record Live (`/record/live`)

**Purpose**: Real-time streaming transcription with live speaker turns.

**Layout**:
- PageHeader: "Live Recording" + back to `/record`
- LiveRecorder component (full-height)
- Real-time transcript scroll area
- Control bar: Start/Stop button + elapsed time

**States**:
1. **idle**: "Start live recording" CTA
2. **starting**: "Connecting to AssemblyAI..." spinner
3. **live**: Transcript streaming, stop button, timer
4. **stopping**: "Saving transcript..." spinner
5. **error**: ErrorAlert with retry
6. **complete**: Auto-redirect to `/meetings/[id]`

**Elements**:
| Element | Component | Interaction |
|---|---|---|
| Start/Stop | Button | Toggle recording |
| Timer | Text display | MM:SS elapsed |
| Transcript | LiveTranscriptView | Auto-scrolling |
| Partial turn | Dimmed text | Live typing indicator |
| Bottom nav | NavBar | Record tab active |

---

### 3.4 Meetings List (`/meetings`)

**Purpose**: Browse all transcribed meetings.

**Layout**:
- PageHeader: "Meetings"
- Meeting list (scrollable)
- Empty state if no meetings

**Each row**:
- Title (heading-sm) — fallback: "Untitled meeting"
- Date (body-sm, neutral-500)
- Duration (body-sm)
- Status chip (right-aligned)

**States**:
1. **populated**: List of meeting rows
2. **empty**: "No meetings yet. Record your first meeting." + CTA to `/record`
3. **loading**: Skeleton rows

**Elements**:
| Element | Component | Interaction |
|---|---|---|
| Meeting row | MeetingListItem | Tap → `/meetings/[id]` |
| Status chip | StatusChip | Visual only |
| Empty CTA | Button | Navigate to `/record` |
| Bottom nav | NavBar | Meetings tab active |

---

### 3.5 Meeting Detail (`/meetings/[id]`)

**Purpose**: Full meeting view with transcript, summary, intake, cost, export.

**Layout**:
- PageHeader: Meeting title + "← Meetings"
- Header row: Date, duration, status chip
- Export buttons (MD, PDF) — completed only
- Tab sections or stacked:
  - Summary card
  - Intake form
  - Cost breakdown panel
  - Full transcript

**States**:
1. **processing**: MeetingDetailPoller with spinner
2. **completed**: Full data rendered
3. **error**: Error message with transcript ID

**Mobile layout**: All sections stacked vertically, full-width

**Elements**:
| Element | Component | Interaction |
|---|---|---|
| Summary | TranscriptView sidebar | Read-only |
| Intake form | IntakeFormView | Read-only |
| Cost panel | MeetingCostPanel | Read-only |
| Transcript | TranscriptView main | Scrollable |
| Export MD | Button | Downloads .md file |
| Export PDF | Button | Downloads .pdf file |
| Bottom nav | NavBar | Meetings tab active |

---

### 3.6 Chat (`/chat`)

**Purpose**: AI chat demo with tool use.

**Layout**: Full-height flex column (no page padding)
- Sticky header: "Chat" + model label + "← Hub"
- Messages scroll area (flex-1)
- ChatInput footer (sticky bottom)

**Message types**:
- User messages: blue-600, right-aligned
- Assistant messages: neutral-900, left-aligned
- Tool cards: inline, with state indicators
- Reasoning: collapsible `<details>`

**Elements**:
| Element | Component | Interaction |
|---|---|---|
| Message | ChatMessage | Read-only |
| Tool card | ToolCard | Collapsible input/output |
| askQuestion | Interactive buttons | Tap to respond |
| Input | ChatInput | Type + Enter to send |
| Bottom nav | NavBar | Chat tab active |

---

### 3.7 Settings (`/settings`)

**Purpose**: Pick AI and transcription models.

**Layout**:
- PageHeader: "Settings"
- 3 sections separated by dividers:
  1. Summarization model (LLM picker)
  2. Transcription — pre-recorded (batch model picker)
  3. Transcription — real-time (streaming model picker)
- Save status badge

**Elements**:
| Element | Component | Interaction |
|---|---|---|
| Model picker | Select | Dropdown, auto-saves on change |
| Section header | SectionHeader | Title + description |
| Status | StatusBadge | Saving/Saved/Error |
| Bottom nav | NavBar | Settings tab active |

---

### 3.8 Pricing (`/pricing`)

**Purpose**: Plan comparison and Stripe checkout.

**Layout**:
- Centered header: "Pricing" badge + headline + subtitle
- 3-column card grid (stacked on mobile)
- Footer: "← Back to hub"

**Tiers**: Free ($0), Core ($15/mo), Pro ($25/mo)

**Pro card highlight**: mint-700 border + accent shadow

---

### 3.9 Usage (`/usage`)

**Purpose**: Per-meeting and aggregate cost tracking.

**Layout**:
- PageHeader: "Usage"
- 4-tile grid: Total meetings, This month, STT spend, LLM spend
- Subscription status section
- Notes about data sources

---

### 3.10 Profile (`/profile`)

**Purpose**: Session + subscription state.

**Layout**:
- PageHeader: "Profile"
- Field grid: Identity, User ID, Subscription, Renews
- Actions: Sign in (if anonymous) or Sign out
- Upgrade link

---

### 3.11 Observability (`/observability`)

**Purpose**: AI call monitoring dashboard.

**Layout**:
- PageHeader: "Observability"
- Stats tiles: Total calls, Errors, Avg latency, Total cost
- Recent calls table: Timestamp, label, model, tokens, cost, duration
- Link to Langfuse dashboard if configured

---

### 3.12 Sign In (`/sign-in`)

**Purpose**: Email magic link authentication.

**Layout**:
- Centered card: Email input + "Send magic link" button
- Success state: "Check your email"
- Error state: ErrorAlert

---

## 4. API Surface

### 4.1 Client-Facing API Routes

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/chat` | Chat with tools (streamText) | Session cookie |
| POST | `/api/transcribe` | Upload audio → AssemblyAI job | Session cookie |
| GET | `/api/transcribe/[id]` | Poll status → summary on complete | Session cookie |
| POST | `/api/transcribe/stream/token` | Mint ephemeral streaming token | Session cookie |
| POST | `/api/transcribe/stream/finalize` | Finalize live session | Session cookie |
| GET | `/api/meetings/[id]/export` | Download MD or PDF | Session cookie |
| GET | `/api/settings` | Read model preferences | None (cookie) |
| PUT | `/api/settings` | Write model preferences | None (cookie) |
| POST | `/api/stripe/checkout` | Create Stripe checkout session | Session cookie |
| POST | `/api/stripe/webhook` | Stripe webhook handler | Stripe signature |

### 4.2 Internal / Observability Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/ai-logs` | Recent AI call logs |
| GET | `/api/ai-logs/errors` | Recent AI errors |
| GET | `/api/ai-logs/stats` | Aggregated AI stats |

---

## 5. AI/LLM Integration Registry

### 5.1 LLM Calls (via Vercel AI Gateway)

| Label | Function | Schema | Model (default) | Traced |
|---|---|---|---|---|
| `meeting-summary` | `summarizeMeeting()` | MeetingSummarySchema | claude-sonnet-4-6 | Yes |
| `intake-form` | `extractIntakeForm()` | IntakeFormSchema | claude-sonnet-4-6 | Yes |
| `chat` | streamText (chat route) | — (free-form) | gpt-4.1-nano | Yes |

### 5.2 Summary Schema Fields

| Field | Type | Description |
|---|---|---|
| `title` | string | 3-8 word headline |
| `summary` | string | 2-3 sentence summary |
| `keyPoints` | string[] | 3-7 bullet points |
| `actionItems` | `{assignee, task, dueDate}[]` | Who does what by when |
| `decisions` | string[] | Conclusions reached |
| `participants` | string[] | Speaker names/labels |

### 5.3 Intake Form Schema Fields

| Field | Type | Description |
|---|---|---|
| `intent` | string | "sales call", "demo", "unclear" |
| `primaryParticipant` | string? | Lead/client name |
| `organization` | string? | Company name |
| `contactInfo` | `{email?, phone?}` | Spoken contact details |
| `budgetMentioned` | string? | "$50k", "tight", etc. |
| `timeline` | string? | Deadline/urgency |
| `decisionMakers` | string[] | Approvers/blockers |
| `requirements` | string[] | Must-haves, features |
| `painPoints` | string[] | Problems raised |
| `nextSteps` | string[] | Agreed follow-ups |

### 5.4 Chat Tools (Registry-Driven)

| Tool | Type | UI | Category | Description |
|---|---|---|---|---|
| `searchDocuments` | server | custom | search | Keyword search across docs |
| `askQuestion` | client | interactive | input | Multi-choice question to user |
| `updateSettings` | server | silent | settings | Background preference update |

### 5.5 Selectable Models

**Summarization (LLM)**:
| ID | Label |
|---|---|
| `anthropic/claude-sonnet-4-6` | Claude Sonnet 4.6 |
| `anthropic/claude-haiku-4-5` | Claude Haiku 4.5 |
| `openai/gpt-4.1-mini` | GPT-4.1 Mini |
| `openai/gpt-4.1-nano` | GPT-4.1 Nano |
| `google/gemini-2.5-flash` | Gemini 2.5 Flash |

**Transcription (Batch)**:
| ID | Label |
|---|---|
| `universal-3-pro` | Universal-3 Pro (best) |
| `universal-2` | Universal-2 (legacy) |
| `nano` | Nano (fastest) |

**Transcription (Streaming)**:
| ID | Label |
|---|---|
| `u3-rt-pro` | Universal-3 Pro RT (best) |
| `u3-rt` | Universal-3 RT (standard) |

---

## 6. Tool & Component Registry Pattern

Following the AI Starter Kit registry model, all tools and components are metadata-driven.

### 6.1 Tool Registry (`lib/ai/tool-meta.ts`)

Single source of truth. Every tool has:
```typescript
{
  name: string;          // function name
  label: string;         // human-readable
  description: string;   // one-line purpose
  type: "server" | "client";
  ui: "custom" | "interactive" | "silent";
  category: string;      // grouping key
}
```

### 6.2 Derived Registries (`lib/registry.ts`)

Auto-computed from tool-meta:
- `TOOL_REGISTRY` — full array for iteration
- `TOOL_BY_NAME` — O(1) lookup by name
- `SILENT_TOOLS` — set of tools with no visible output
- `CUSTOM_UI_TOOLS` — set of tools with rich card rendering
- `INTERACTIVE_TOOLS` — set of client-side tools needing user input

### 6.3 How Components Use the Registry

1. **ChatMessage** checks `SILENT_TOOLS` to skip rendering
2. **ChatMessage** uses `TOOL_BY_NAME` for label lookup
3. **ToolCard** uses `TOOL_BY_NAME` for header label
4. **Hub page** iterates `TOOL_REGISTRY` for the tools grid
5. **Stats cards** use `.size` of each derived set

---

## 7. Platform-Specific Considerations

### 7.1 iOS (Capacitor WebView)

- Safe area insets via CSS `env(safe-area-inset-*)` — top padding on body, bottom on nav bar
- Bottom tab bar with `pb-[env(safe-area-inset-bottom)]` for home indicator
- 44px minimum touch targets on all interactive elements
- `contentInset: "always"` in Capacitor config
- Mic permission declared in Info.plist (`NSMicrophoneUsageDescription`)
- Status bar style: `black-translucent`

### 7.2 macOS (Tauri)

- Window: 1100x760 default, 720x480 minimum
- System audio capture via ScreenCaptureKit (requires Screen Recording permission)
- Mic capture via cpal (cross-platform)
- No bottom tab bar override needed (works as-is)
- Title bar: native Tauri window chrome

### 7.3 Web (Vercel)

- Responsive: 375px (mobile) to 1440px+ (desktop)
- Max content width: varies by page (max-w-2xl for forms, max-w-5xl for grids)
- PWA manifest at `/manifest.webmanifest`

---

## 8. Responsive Breakpoints

| Breakpoint | Width | Layout changes |
|---|---|---|
| Mobile | < 640px | Single column, stacked cards, full-width buttons |
| Tablet | 640-1024px | 2-column grids, sidebar collapses |
| Desktop | > 1024px | Full multi-column layouts, side-by-side panels |

---

## 9. Interaction Patterns

### 9.1 Recording Flow
```
Hub → Record → [Record or Upload] → Processing → Meeting Detail
Hub → Record → Live Mode → [Start] → Live Transcript → [Stop] → Meeting Detail
```

### 9.2 Meeting Review Flow
```
Meetings List → Meeting Detail → [Export MD/PDF]
Meeting Detail → Transcript (scroll)
Meeting Detail → Summary (read)
Meeting Detail → Intake Form (read)
Meeting Detail → Cost Breakdown (read)
```

### 9.3 Settings Flow
```
Settings → Pick Model → Auto-save → Status Badge
```

### 9.4 Billing Flow
```
Pricing → Subscribe → Stripe Checkout → Webhook → Profile Updated
Usage → View Spend
Profile → Subscription Status
```

---

## 10. Data Flow & State

### 10.1 Meeting Lifecycle States
```
queued → processing → completed
                   → error
```

### 10.2 Client State Sources

| State | Source | Persistence |
|---|---|---|
| Model preferences | Cookie (`audio-layer-settings`) | Browser-local, 1 year |
| Auth session | Supabase cookie | Server-managed |
| Meeting data | Supabase `meetings` table | Persistent |
| Subscription | Supabase `profiles` table | Stripe-synced |
| AI telemetry | In-memory ring buffer | Per-process, 500 entries |
| AI telemetry (prod) | Langfuse | Persistent, queryable |

---

## 11. Accessibility Requirements

Per iOS HIG (applied across all platforms):

- [ ] All touch targets 44px minimum
- [ ] All text uses scalable font sizes
- [ ] No information conveyed by color alone — pair with icons/text
- [ ] Contrast ratio 4.5:1 minimum for body text
- [ ] Screen reader labels on all interactive elements
- [ ] Focus indicators on keyboard navigation
- [ ] `prefers-reduced-motion` disables animations
- [ ] `prefers-color-scheme` for light/dark switching (when implemented)

---

## 12. Light Mode (TBD)

The current app is dark-mode only. When light mode is added:

- Swap neutral palette (950↔50, 900↔100, etc.)
- Mint accent stays the same across modes
- Use CSS custom properties or Tailwind `dark:` for switching
- Semantic colors (success/error/warning) adjust for contrast
- Background hierarchy: white → gray-50 → gray-100
- Test all text/background combinations for 4.5:1 contrast

---

## 13. Asset Requirements

### Icons needed
- App icon: 1024x1024 source (already generated as placeholder)
- Tab bar icons (5): Home, Mic, List, Chat bubble, Gear — currently inline SVG
- Status icons: Checkmark, Error X, Spinner, Pulse dot
- Export icons: Download, PDF, Markdown
- Speaker icon for transcript turns

### Illustrations / Empty States
- No meetings empty state
- No recordings empty state
- Processing animation (could be Lottie)

---

## 14. Files to Create / Modify

### New files for design system
- `lib/design-tokens.ts` — exportable token values
- `components/ui/button.tsx` — standardized button variants
- `components/ui/card.tsx` — standardized card wrapper
- `components/ui/chip.tsx` — status chips
- `components/ui/select.tsx` — form select
- `components/ui/input.tsx` — form text input
- `components/ui/empty-state.tsx` — empty state pattern
- `components/ui/progress.tsx` — progress indicators

### Pages to restyle
- All 13 pages updated to use shared components + design tokens
- Remove inline Shell components, use layout-level PageHeader
- Consistent card/section patterns matching pricing page

---

*This spec is the input for a design agent to produce complete, production-ready UI across all views and platforms. All functional code exists — this is purely the visual/interaction layer.*
