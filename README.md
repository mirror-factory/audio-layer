# Layers

**Audio intelligence for conversations that matter.**

Capture, transcribe, and extract structured data — budgets, timelines, decisions, action items — not just summaries. Ships as web, macOS desktop (Electron), and iOS (Capacitor) from a single Next.js codebase.

A [Mirror Factory](https://mirrorfactory.ai) product.

---

## Features

- **Live streaming transcription** — Real-time via AssemblyAI with speaker diarization
- **Structured extraction** — AI generates summaries, key points, action items, decisions, and intake forms
- **Batch transcription** — Upload audio files for processing
- **User-selectable models** — 9 LLMs (Claude, GPT, Gemini) + 5 speech models
- **Cost transparency** — Per-meeting cost breakdown (STT + LLM)
- **Stripe billing** — Free (25 meetings) / Core ($15/mo) / Pro ($25/mo)
- **Multi-platform** — Web, macOS (Electron), iOS/Android (Capacitor)
- **Semantic search** — Hybrid vector + BM25 search across all conversations (pgvector HNSW)
- **MCP server** — Connect any AI assistant to your meetings (6 tools, API key auth)
- **Auto-embedding** — Meetings vectorized on completion for instant cross-conversation search
- **Observability** — withRoute + withExternalCall wrappers, Langfuse OTel

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind v4, TypeScript |
| LLM | Vercel AI SDK v6 via AI Gateway |
| Transcription | AssemblyAI (batch + streaming, v3 API) |
| Database | Supabase (PostgreSQL + RLS) |
| Billing | Stripe |
| Email | Resend |
| Observability | Langfuse via OpenTelemetry |
| Desktop | Electron |
| Mobile | Capacitor 8 |
| Testing | Vitest (95 unit), Playwright (68 e2e) |

## Getting Started

```bash
pnpm install
cp env.local.template .env.local  # Fill in API keys
pnpm dev
```

**Minimum env vars:** `AI_GATEWAY_API_KEY`, `ASSEMBLYAI_API_KEY`

**For persistence:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**For billing:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_CORE`, `STRIPE_PRICE_PRO`

Run `lib/supabase/schema.sql` in Supabase SQL Editor to create tables.

See [docs/PRICING_AND_BILLING.md](docs/PRICING_AND_BILLING.md) for complete billing/Stripe setup.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Unit tests (95) |
| `pnpm test:e2e` | Playwright e2e (68 tests, 6 viewports) |
| `pnpm electron:dev` | Electron desktop |
| `pnpm electron:build` | Build DMG |
| `npx cap sync` | Sync Capacitor |

## Project Structure

```
app/              UI pages + API routes
lib/              Core libraries (assemblyai, billing, meetings, stripe, email, supabase)
components/       React components (recorder, transcript, shader, top-bar, slide-menu)
electron/         Desktop shell (main.js, preload.js)
server/           Langfuse OTel setup (Node.js only)
docs/             BUILD_SPEC, PRICING, SCHEMAS, roadmap, brand/style guides
```

## Documentation

| Document | Purpose |
|----------|---------|
| [EMBEDDINGS_AND_SEARCH.md](docs/EMBEDDINGS_AND_SEARCH.md) | Vector embeddings, hybrid search, MCP server, cost analysis |
|----------|---------|
| [BUILD_SPEC.md](docs/BUILD_SPEC.md) | Complete blueprint — every route, schema, config |
| [PRICING_AND_BILLING.md](docs/PRICING_AND_BILLING.md) | Stripe setup, vendor pricing, margin analysis |
| [SCHEMAS_AND_REGISTRIES.md](docs/SCHEMAS_AND_REGISTRIES.md) | Zod schemas, TypeScript interfaces, SQL |
| [roadmap.md](docs/roadmap.md) | Product roadmap |
| [brand-guide.md](docs/brand-guide.md) | Brand identity |
| [style-guide.md](docs/style-guide.md) | Component styles |

## License

Proprietary — Mirror Factory
