# audio-layer

The first standalone product built on the Layers platform by The Near Factory.

Bootstrapped from [mirror-factory/vercel-ai-starter-kit](https://github.com/mirror-factory/vercel-ai-starter-kit) — Next.js 15 + AI SDK v6 + TypeScript + Tailwind v4 + pnpm, with Langfuse observability, Claude Code hooks, registries, and enforcement gates.

## Quickstart

```bash
pnpm install
cp .env.example .env.local   # fill in AI_GATEWAY_API_KEY, LANGFUSE_*, etc.
pnpm dev
```

Then open:
- http://localhost:3000 — Hub
- http://localhost:3000/chat — reference chat with tool calls
- http://localhost:3000/observability — AI call logs / costs / errors

## Gates

```bash
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest (unit + registry-sync)
pnpm compliance  # 12 automated checks from the starter kit
pnpm build       # next build
pnpm lint        # eslint flat config
```

Husky pre-commit runs typecheck + test; pre-push re-runs them plus compliance.

## What's wired

- **AI SDK v6** via `@ai-sdk/gateway` — routing, fallbacks, semantic caching
- **Langfuse OTEL** — auto-tracing for every `generateText` / `streamText` call (see `instrumentation.ts` + `lib/langfuse-setup.ts`)
- **Telemetry middleware** — `withTelemetry()` wraps AI calls, feeds the `/observability` dashboard
- **Tool registry** — `lib/ai/tool-meta.ts` single source of truth, enforced by registry-sync tests
- **Claude Code hooks** — `.claude/hooks/*.py` for session startup, reground, format
- **Skills** — `.claude/skills/*` for observability-debug, wire-telemetry, compliance-fix, visual-qa, context7-first
- **Nightly CI** — `.github/workflows/nightly.yml`
- **Playwright** — smoke, visual-regression, mobile
- **Research cache** — `.claude/research/` with freshness enforcement

## Next up

Granola Mode features: audio capture, Deepgram Nova-3 streaming, meeting schema, AI summary, export (MD/PDF/audio), intake-form extraction, Stripe, landing page.
