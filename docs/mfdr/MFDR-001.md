# MFDR-001: Layer One Audio — Product Architecture

**Status:** Accepted
**Date:** 2026-04-18
**Owner:** Alfonso Morales
**Phase:** Production

---

## Context

Mirror Factory is building Layer One Audio, a tool that captures conversations and extracts structured, actionable context from them. The AI meeting assistant market is valued at $1.42B in 2026, growing to $6.28B by 2035 (18% CAGR, Precedence Research). The AI note-taking market is $740M, growing to $3.5B by 2035 (18.75% CAGR). The transcription segment specifically is the fastest-growing at 25.62% CAGR.

Current solutions either put a visible bot in the meeting (Otter, Fireflies, Fathom) or are limited to a single platform (Granola — Mac only until late 2025). None of them extract structured CRM-ready data (budgets, timelines, decision makers) — they stop at summaries and action items.

This MFDR documents seven key architectural decisions, each with options considered, research-backed justification, and pricing analysis.

---

## Decision 1: Desktop Shell — Tauri vs Electron

### Decision Drivers
- Bundle size and memory usage (this is a background recording tool — it must be lightweight)
- System audio capture capability (bot-free recording)
- Cross-platform potential (macOS now, Windows later)

### Options Considered

**Option A: Electron**
- Bundle: 80-200MB (ships Chromium + Node.js)
- Memory: 200-300MB idle
- Startup: 1-2 seconds
- System audio: Requires third-party kernel extensions (Soundflower/BlackHole)
- Ecosystem: Largest (Spotify, Discord, Figma, VS Code)
- Effort: Low (JavaScript/TypeScript throughout)

**Option B: Tauri 2.x (Chosen)**
- Bundle: 2-10MB (uses OS native WebView, 25x smaller)
- Memory: 30-40MB idle (58-75% less than Electron)
- Startup: <0.5 seconds (4x faster)
- System audio: Native ScreenCaptureKit access via Rust (same API Granola uses)
- Ecosystem: Growing, fewer production examples
- Effort: Medium (Rust backend, but UI is still web tech)

**Sources:** [PkgPulse Benchmarks (2026)](https://www.pkgpulse.com/blog/tauri-vs-electron-2026), [Gethopp Analysis](https://www.gethopp.app/blog/tauri-vs-electron), [Levminer Real-World Test](https://www.levminer.com/blog/tauri-vs-electron)

### Decision

**We chose Tauri** because a meeting recorder must run in the background continuously without users noticing the resource impact. 200MB idle RAM is unacceptable for a background tool. More critically, Tauri's Rust backend can call ScreenCaptureKit directly for macOS system audio capture — the only way to record the "other side" of a call without a meeting bot. This capability is impossible in Electron without unsigned kernel extensions that enterprise IT departments will block.

The trade-off is Rust compilation time (3-5 min first build, ~5s incremental). This affects developer velocity, not user experience.

---

## Decision 2: Mobile Shell — Capacitor vs React Native vs Flutter

### Decision Drivers
- Code sharing with the web app (team size is 1-2 people)
- Access to native APIs (microphone, background audio)
- Update velocity (ship fixes without App Store review)

### Options Considered

**Option A: React Native**
- Requires a separate UI layer (can't share Next.js pages)
- 35% market share among mobile developers
- Large ecosystem, strong hiring pool
- JSI (New Architecture, 2026) dramatically improves performance
- Effort: High (essentially a second frontend codebase)

**Option B: Flutter**
- 46% market share, highest raw performance (Impeller engine, 60-120 FPS)
- Compiles to native code on all platforms
- Requires Dart — no code sharing with existing React/Next.js
- Pixel-perfect consistency across platforms
- Effort: High (new language, new framework)

**Option C: Capacitor 8 (Chosen)**
- WebView wraps the live Next.js deployment — one codebase serves all platforms
- Access to native APIs (mic, contacts, push notifications) via plugins
- Updates ship by deploying to Vercel — no App Store review needed
- Performance is adequate for text-heavy apps (reading/submitting data)
- Effort: Low (no additional UI code, just platform config)

**Sources:** [OpenForge CTO Guide (2026)](https://openforge.io/capacitor-vs-flutter-what-ctos-need-to-know-in-2026/), [Capgo AI Mobile Apps Analysis](https://capgo.app/blog/capacitor-ai-mobile-apps/), [The Debuggers Comparison](https://thedebuggersitsolutions.com/blog/cross-platform-app-2026-flutter-react-native-capacitor)

### Decision

**We chose Capacitor** because our app is text-heavy (transcripts, summaries, forms) — not animation-heavy or gesture-intensive. A WebView is perfectly adequate. The decisive advantage: the Capacitor shell loads the Vercel deployment URL, so every code change ships instantly to all mobile users without App Store review. React Native and Flutter would require separate codebases, separate deployment pipelines, and separate bug fixes for issues that only affect one platform. With a 1-2 person team, that's untenable.

The trade-off: WebView performance is lower than native for complex animations. For our use case (reading text, tapping buttons, recording audio), this is acceptable.

---

## Decision 3: Speech-to-Text — AssemblyAI vs Deepgram vs Whisper vs Google Cloud STT

### Decision Drivers
- Transcription accuracy (table stakes — product is worthless if words are wrong)
- Real-time streaming capability (live transcription during meetings)
- Cost per hour of audio
- Speaker diarization quality
- Vendor switchability

### Options Considered

**Option A: AssemblyAI Universal-3 Pro (Chosen)**

| Metric | Value |
|---|---|
| WER (English, real-world) | 5.6% mean across 26 datasets |
| WER (LibriSpeech Clean) | 1.52% |
| Hallucination rate | 30% lower than Whisper Large-v3 |
| Batch pricing | $0.21/hr |
| Streaming pricing | $0.45/hr (u3-rt-pro) |
| Budget streaming | $0.15/hr (universal-streaming) |
| Speaker diarization | Built-in, no addon cost |
| Entity detection | $0.08/hr addon |
| Languages | 60+ (Universal-3 Pro) |
| SOC 2 compliance | Type II |

**Option B: Deepgram Nova-3**

| Metric | Value |
|---|---|
| WER (English, internal benchmark) | 5.26% (Deepgram-authored, 2,703 files) |
| WER (independent AA-WER) | ~18% on mixed real-world datasets |
| Batch pricing | $0.25/hr |
| Streaming pricing | $0.22/hr |
| Speaker diarization | Built-in |
| Languages | 36 |
| Streaming latency | <300ms (industry-leading) |

**Option C: OpenAI Whisper (self-hosted)**

| Metric | Value |
|---|---|
| WER (English) | 6.5% |
| WER (Multilingual) | 7.4% |
| Batch pricing | Free (self-hosted compute costs) |
| Streaming | Not natively supported (batch only) |
| Speaker diarization | Not built-in (requires pyannote or similar) |
| Languages | 99 |
| Hosting cost | ~$0.50-2/hr GPU compute |

**Option D: Google Cloud Speech-to-Text (Chirp)**

| Metric | Value |
|---|---|
| WER (Chirp 2) | 11.6% |
| Batch pricing | $0.96/hr |
| Streaming pricing | $1.44/hr |
| Speaker diarization | Built-in |
| Languages | 125+ |

**Sources:** [AssemblyAI Benchmarks](https://www.assemblyai.com/benchmarks), [Deepgram Comparison Guide (2026)](https://deepgram.com/learn/best-speech-to-text-apis-2026), [Northflank Open-Source STT Benchmarks (2026)](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks), [AssemblyAI WER Analysis](https://www.assemblyai.com/blog/word-error-rate-is-broken)

### Decision

**We chose AssemblyAI** for the best combination of accuracy, features, and cost. At 5.6% mean WER across 26 real-world datasets, it has the lowest independently verified error rate. Google Cloud STT costs 4.5x more ($0.96/hr vs $0.21/hr) with worse accuracy (11.6% WER). Deepgram's self-reported 5.26% WER uses their own benchmark, while independent testing shows ~18% on mixed datasets.

Critically, AssemblyAI offers both batch AND streaming in a single API with speaker diarization built-in. Whisper requires self-hosting, doesn't support streaming natively, and needs separate diarization (pyannote), adding complexity and cost.

**Switchability**: The app's settings page lets users select their transcription model. Adding Deepgram as an alternative provider requires only a new API client — the architecture doesn't lock us to AssemblyAI.

### Competitor Transcription Accuracy (Independent Testing)

The following data comes from [SummarizeMeeting.com's 2026 WER Benchmark](https://summarizemeeting.com/en/comparison/transcription-accuracy) — an independent test using real meeting audio across multiple conditions (clean, noisy, multi-speaker, accented):

| Tool / Engine | Clean Audio Accuracy | Noisy/Multi-Speaker | WER (Clean) | Notes |
|---|---|---|---|---|
| **AssemblyAI Universal-3 Pro** | 97.9% | 94% | 2.1% | Lowest WER in clean conditions. Our chosen engine. |
| **Otter.ai** (proprietary) | 97.9% | 85-94% | 2.1-15% | Matches AssemblyAI on clean audio, degrades more in noise |
| **Deepgram Nova-3** | 96-98% | 92-96% | 2-4% | Best real-time latency. Holds up well in noise. |
| **Fireflies** (proprietary) | 92-94% | 85-90% | 6-15% | Drops significantly with accents and crosstalk |
| **OpenAI Whisper Large-v3** | 96.8-97.9% | 90-96% | 2.1-10% | Best multilingual (99 languages). No real-time streaming. |
| **Fathom** (proprietary) | ~92% | ~85% | ~8-15% | Limited independent data available |
| **Granola** (proprietary) | ~93-95% | ~88-92% | ~5-12% | Uses device mic + system audio; accuracy depends on capture quality |
| **Google Chirp 2** | ~88% | ~80-85% | ~12-20% | Most expensive ($0.96/hr). Worst accuracy of major providers. |

**Key findings:**
- All tools claim 95-99% accuracy but this only holds for clean, single-speaker English audio. Real-world meeting accuracy is 15-20% lower (multiple speakers, accents, background noise).
- Otter leads among the closed-source competitors on raw transcription accuracy.
- Granola's accuracy is more variable because it captures via device mic/system audio — the transcription engine is only as good as the audio input.
- Using noise cancellation (e.g., Krisp) before transcription reduces WER by up to 39% across all tools.
- Professional human transcribers achieve 99%+ accuracy — AI still has a gap, but it's closing.

**Sources:** [SummarizeMeeting WER Benchmarks (2026)](https://summarizemeeting.com/en/comparison/transcription-accuracy), [Krisp Data-Backed Reviews (2026)](https://krisp.ai/blog/best-ai-meeting-assistant/), [Meetily Accuracy Ranking (2026)](https://meetily.ai/blog/best-meeting-notes-software-2026), [Convo Comparison (2026)](https://www.itsconvo.com/blog/granola-vs-otter-vs-fathom)

---

## Decision 4: LLM Integration — Vercel AI SDK + Gateway vs LangChain vs Direct Provider APIs vs OpenRouter

### Decision Drivers
- Structured output reliability (summaries must match our Zod schema every time)
- Model flexibility (users should pick their own LLM)
- Observability (trace every LLM call for cost and quality monitoring)
- Bundle size and latency (this runs in Next.js API routes)

### Options Considered

**Option A: Vercel AI SDK v6 + AI Gateway (Chosen)**
- `generateObject` with Zod schemas — guaranteed structured output
- `streamText` / `streamObject` for real-time UI
- AI Gateway: single API key routes to 100+ models across Anthropic, OpenAI, Google, xAI, Mistral
- Zero markup on token pricing (provider list prices)
- Zero data retention by default
- Built-in OpenTelemetry → Langfuse traces every call
- 30ms p99 latency, native edge support
- Bundle: lightweight (part of the Next.js build)

**Option B: LangChain JS**
- Most comprehensive agent/RAG framework
- 101.2 kB gzipped bundle (3x Vercel AI SDK)
- 50ms p99 latency
- Does NOT support edge runtime (blocks Vercel Edge deployment)
- Complex abstraction layer — overkill for our use case (we're not building agents or RAG)
- Structured output via output parsers (less reliable than Zod-validated generateObject)

**Option C: Direct Provider SDKs (Anthropic + OpenAI + Google)**
- OpenAI SDK: 34.3 kB gzipped, 8.8M weekly downloads
- Maximum control, minimal abstraction
- Requires managing 3+ API keys, 3+ billing dashboards
- No unified observability
- Structured output via JSON mode (less reliable than schema-validated)
- No model switching without code changes

**Option D: OpenRouter**
- 300+ models via single API
- 5.5% markup on all requests
- Zero data retention
- No native `generateObject` or structured output support
- No built-in telemetry integration
- At $100K/year spend, the 5.5% markup costs $5,500

**Sources:** [Strapi Comparison Guide (2026)](https://strapi.io/blog/langchain-vs-vercel-ai-sdk-vs-openai-sdk-comparison-guide), [TrueFoundry Gateway vs OpenRouter](https://www.truefoundry.com/blog/vercel-ai-gateway-vs-openrouter), [NeuralRouting Pricing Comparison (2026)](https://neuralrouting.io/blog/ai-gateway-pricing-comparison-2026)

### Decision

**We chose Vercel AI SDK + AI Gateway** because:
1. `generateObject` with Zod schemas is the only framework that guarantees structured output matches our TypeScript types. This eliminates parsing errors and hallucinated fields.
2. AI Gateway provides zero-markup model routing. OpenRouter charges 5.5%. At scale, this saves thousands.
3. Native OpenTelemetry integration means every LLM call is traced to Langfuse automatically — no custom instrumentation code.
4. The SDK is designed for Next.js — streaming responses, edge support, server components. LangChain doesn't even support edge runtime.

We're not building agents or RAG pipelines (where LangChain excels). We're making two structured extraction calls per meeting. The AI SDK is purpose-built for this.

---

## Decision 5: LLM Model Selection & Pricing

### Available Models (via AI Gateway, April 2026)

**Summarization default: GPT-5.4 Nano ($0.20/$1.25 per 1M tokens)**

| Provider | Model | Input/1M | Output/1M | Released | Use Case |
|---|---|---|---|---|---|
| OpenAI | GPT-5.4 Nano | $0.20 | $1.25 | Mar 2026 | Default — cheapest current-gen |
| Google | Gemini 3.1 Flash Lite | $0.25 | $1.50 | Mar 2026 | Budget alternative |
| OpenAI | GPT-5.4 Mini | $0.75 | $4.50 | Mar 2026 | Mid-tier |
| Google | Gemini 3 Flash | $0.50 | $3.00 | Dec 2025 | Mid-tier |
| Anthropic | Claude Haiku 4.5 | $1.00 | $5.00 | Oct 2025 | Best quality at low cost |
| OpenAI | GPT-5.4 | $2.50 | $15.00 | Mar 2026 | High quality |
| Google | Gemini 3.1 Pro | $2.00 | $12.00 | Nov 2025 | High quality |
| Anthropic | Claude Sonnet 4.6 | $3.00 | $15.00 | Feb 2026 | Premium |
| Anthropic | Claude Opus 4.7 | $5.00 | $25.00 | Apr 2026 | Best available |

**Per-meeting cost analysis** (30-minute meeting, ~4,000 input tokens, ~800 output tokens, 2 calls: summary + intake):

| Model | Cost per meeting | Monthly (40 meetings) |
|---|---|---|
| GPT-5.4 Nano | $0.003 | $0.13 |
| Gemini 3.1 Flash Lite | $0.004 | $0.15 |
| Claude Haiku 4.5 | $0.012 | $0.48 |
| Claude Sonnet 4.6 | $0.036 | $1.44 |
| Claude Opus 4.7 | $0.060 | $2.40 |

Users select their model in settings. The app shows real-time pricing for each option. Default is GPT-5.4 Nano — the newest, cheapest model that produces acceptable quality.

---

## Decision 6: Competitive Positioning

### Market Comparison (April 2026)

| Feature | Layer One Audio | Granola | Otter.ai | Fireflies | Fathom |
|---|---|---|---|---|---|
| **Pricing** | Free (25) / $15 / $25 | Free / $14/mo | Free / $16.99/mo | Free / $19/mo | Free (5 AI/mo) |
| **Bot in meeting** | No | No | Yes | Yes/Optional | Yes |
| **Platforms** | Web + Mac + iOS | Mac + Win + iOS | Web + mobile | Web + desktop | Web |
| **Structured extraction** | Budget, timeline, decision makers, requirements, pain points | No | No | Limited (sales focus) | No |
| **Model selection** | User picks (9 models) | Fixed | Fixed | Fixed | Fixed |
| **Cost transparency** | Per-meeting breakdown | No | No | No | No |
| **System audio** | ScreenCaptureKit | ScreenCaptureKit | N/A (bot) | N/A (bot) | N/A (bot) |
| **Free tier** | 25 meetings lifetime | Limited history | 300 min/mo | 800 min storage | 5 AI summaries/mo |
| **Transcription** | AssemblyAI U3 Pro | Proprietary | Proprietary | Proprietary | Proprietary |
| **Export** | PDF + Markdown | Limited | Limited | Multiple | Limited |

**Sources:** [Granola Pricing Comparison](https://www.granola.ai/blog/meeting-note-tool-pricing-granola-vs-fireflies-fathom-otter), [Convo 2026 Comparison](https://www.itsconvo.com/blog/granola-vs-otter-vs-fathom), [Read.ai Best Assistants (2026)](https://www.read.ai/articles/best-ai-meeting-assistants)

### Our Advantages
1. **Structured extraction**: No competitor auto-extracts CRM-ready fields. They produce summaries; we produce actionable data.
2. **Model transparency**: Users see exactly which model processes their data, at what cost. Competitors hide this.
3. **Multi-platform from day one**: Web + macOS + iOS from a single codebase. Granola only added Windows and mobile in late 2025.
4. **Price**: $15/mo Core tier undercuts Otter ($17), Fireflies ($19), and matches Granola ($14) while offering more extraction features.

---

## Decision 7: Database & Auth — Supabase vs Firebase vs Custom

### Options Considered

**Option A: Supabase (Chosen)**
- PostgreSQL with Row Level Security — each user's data is isolated at the database level
- Built-in auth: anonymous (zero-friction onboarding), email magic link, Google OAuth
- pgvector extension for future semantic search
- Free tier: 500MB database, 50K auth users
- Pro: $25/mo (8GB, unlimited auth)

**Option B: Firebase**
- NoSQL (Firestore) — harder to query for analytics
- Firebase Auth is mature but lock-in is severe
- No SQL joins for cost aggregation across meetings
- Free tier generous but pricing unpredictable at scale

**Option C: Custom (Postgres + NextAuth)**
- Maximum control
- Requires self-hosting or managed Postgres ($15-50/mo)
- Auth from scratch or NextAuth (additional integration work)
- No built-in RLS — must implement access control in application code

### Decision

**We chose Supabase** because RLS policies enforce data isolation at the database level — a user literally cannot query another user's meetings even if application code has a bug. The anonymous auth feature is critical: users start recording immediately without creating an account. The session upgrades seamlessly to email/Google when they're ready.

---

## Consequences

### What this enables
- Ship to 3 platforms from a team of 1-2
- Bot-free meeting capture via system audio (ScreenCaptureKit)
- User-selectable LLM with transparent per-meeting cost
- Structured data extraction as the competitive moat
- Instant mobile updates via Capacitor + Vercel

### What this limits
- Capacitor WebView performance is lower than native Swift/Kotlin
- Rust learning curve for Tauri contributors
- Vendor dependencies: AssemblyAI (STT), Vercel (hosting + AI Gateway), Supabase (database + auth)
- Cannot record native iOS phone calls (platform limitation)

### What to watch
- AssemblyAI pricing changes — maintain switchability to Deepgram
- Capacitor WebView performance on older devices
- AI Gateway credit consumption — set spend limits
- Tauri ScreenCaptureKit compatibility with future macOS versions

---

## Connection to Direction

**Mission alignment:** Layer One Audio enables human agency by capturing conversational context that would otherwise be lost. Users focus on the conversation; the AI extracts what they need to take action.

**KPI impact:**
- Time saved: 15 min post-meeting note consolidation → 0
- Capture rate: 90%+ of spoken commitments extracted
- Activation: First meeting transcribed within 60 seconds

**Phase transition:** Architecture is proven (v0.0.1 deployed). Focus shifts to UI polish, feature completeness, and user acquisition.

---

## Follow-up

- [ ] Validate WebView performance on iPhone SE (lowest-spec target)
- [ ] Set AssemblyAI spend alerts at $50 and $100
- [ ] Implement Deepgram as alternative STT provider
- [ ] Load test: 100 concurrent streaming sessions
- [ ] A/B test: GPT-5.4 Nano vs Gemini 3.1 Flash Lite for summary quality
- [ ] User interviews: Is structured intake extraction actually valued?
- [ ] Competitive monitoring: Granola feature parity tracking

---

*Mirror Factory Decision Record • Layer One Audio v1.0*
