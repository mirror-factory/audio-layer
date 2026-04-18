# audio-layer

Multi-platform audio intake and meeting transcription. Record or upload audio, get speaker-segmented transcripts, AI summaries, and structured intake forms. Ships as web, desktop (Tauri), and mobile (Capacitor) — all wrapping the same Next.js backend.

---

## Start here

| You want to | Read |
|---|---|
| Run it locally (2 API keys, 5 minutes) | [SETUP.md](./SETUP.md) |
| Understand the architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| See every API endpoint | [API.md](./API.md) |
| Know what it costs to run | [COSTS.md](./COSTS.md) |
| Operate it in production | [OPERATIONS.md](./OPERATIONS.md) |
| Build for desktop or mobile | [PLATFORMS.md](./PLATFORMS.md) |
| Check what's not yet proven | [VERIFICATION_GAPS.md](./VERIFICATION_GAPS.md) |
| Write code as an AI agent | [AGENTS.md](./AGENTS.md) |

Platform-specific internals:
- [src-tauri/README.md](./src-tauri/README.md) — Tauri desktop shell
- [mobile/README.md](./mobile/README.md) — Capacitor mobile setup

---

## Quickstart

```bash
git clone https://github.com/mirror-factory/audio-layer
cd audio-layer
pnpm install
cp .env.example .env.local
# Set AI_GATEWAY_API_KEY and ASSEMBLYAI_API_KEY — see SETUP.md for where to get them
pnpm dev
```

Open `http://localhost:3000/record`. Upload audio or record from your mic. Without Supabase, meetings live in-memory. Add persistence, auth, billing, and observability in layers per [SETUP.md](./SETUP.md).

For desktop or mobile builds, see [PLATFORMS.md](./PLATFORMS.md).

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind v4, TypeScript |
| LLM | Vercel AI Gateway (Claude Sonnet 4.6 default, user-selectable via `/settings`) |
| Transcription | AssemblyAI Universal-3 Pro — batch + real-time streaming |
| Auth | Supabase (anonymous auto, magic link upgrade) |
| Database | Supabase Postgres with RLS |
| Billing | Stripe Checkout + webhook, paywall at 25 free meetings |
| Observability | Langfuse via OpenTelemetry + built-in `/observability` page |
| Export | PDF (`@react-pdf/renderer`) + Markdown |
| Desktop | Tauri 2.x (Rust, macOS system audio via ScreenCaptureKit) |
| Mobile | Capacitor 8 (WebView) |
| Tests | Vitest 106 unit + Playwright 6 e2e specs |

---

## Routes

| Path | What it does |
|---|---|
| `/` | Hub — links to everything |
| `/record` | Upload or record audio, batch transcription |
| `/record/live` | Real-time streaming transcription via WebSocket |
| `/meetings` | List of all transcribed meetings |
| `/meetings/[id]` | Detail view with transcript, summary, intake form, cost panel |
| `/chat` | Chat demo with tool use |
| `/settings` | Pick AssemblyAI and LLM models |
| `/usage` | Per-meeting and aggregate cost tracking |
| `/pricing` | Plan comparison + Stripe checkout |
| `/profile` | Session + subscription state |
| `/observability` | AI call logs, latency, cost |
| `/sign-in` | Email magic link authentication |

Full request/response docs for every API route: [API.md](./API.md).

---

## Verification

```bash
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest — 106 tests
pnpm test:e2e         # playwright — 6 specs
pnpm compliance       # 12 pattern checks
pnpm build            # next build — 23 routes
pnpm gates            # runs all of the above
```

Pre-commit hooks run typecheck + test. Pre-push adds compliance. See [OPERATIONS.md](./OPERATIONS.md) for the full testing matrix.

---

## License

All rights reserved — Mirror Factory.
