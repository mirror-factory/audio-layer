# Transcription Provider Matrix

Validated on: 2026-04-26; AssemblyAI default rechecked 2026-04-27

Source of truth: `lib/billing/stt-pricing.ts`

This file explains the catalog used by `/admin/pricing`. All rates are normalized to USD per audio hour so plan margin math can compare realtime, batch, per-minute, and token-equivalent billing.

## Current Runtime

Layer One currently records and transcribes through AssemblyAI. Non-AssemblyAI providers in the catalog are pricing and evaluation candidates until a provider adapter is implemented.

The active recorder preflight reads the admin pricing source of truth before
recording starts, so the UI can show the exact provider/model and cost source
without minting a paid token.

Runtime-supported settings:

| Mode | Model | Rate | Notes |
| --- | ---: | ---: | --- |
| Streaming | AssemblyAI Universal Streaming Multilingual | $0.15/hr base; +$0.12/hr optional diarization | Default live option |
| Streaming | AssemblyAI Universal Streaming English | $0.15/hr base; +$0.12/hr optional diarization | English-only low-cost path |
| Streaming | AssemblyAI Whisper Streaming | $0.30/hr + $0.12/hr diarization | Broad language fallback |
| Streaming | AssemblyAI Universal-3 Pro Streaming | $0.45/hr + $0.12/hr diarization | Quality candidate |
| Batch | AssemblyAI Universal-2 | $0.15/hr + $0.02/hr diarization | Default upload/import path |
| Batch | AssemblyAI Universal-3 Pro | $0.21/hr + $0.02/hr diarization | Higher-quality upload/import path |

## Provider Candidates

| Provider | Model | Mode | Public rate | Runtime status | Primary reason to test |
| --- | --- | --- | ---: | --- | --- |
| Soniox | Realtime STT | Streaming | ~$0.12/hr | Adapter needed | Cost leader |
| Soniox | Async File STT | Batch | ~$0.10/hr | Adapter needed | Low-cost imports |
| AssemblyAI | Universal Streaming Multilingual | Streaming | $0.15/hr | Implemented | Current base runtime + good COGS |
| Gladia | Growth Realtime | Streaming | from $0.25/hr | Adapter needed | Diarization/language features bundled |
| Speechmatics | Pro STT | Streaming/batch | from $0.24/hr | Adapter needed | Strong realtime benchmark accuracy |
| ElevenLabs | Scribe v2 Realtime | Streaming | $0.39/hr | Adapter needed | Strong independent AA-WER result |
| Deepgram | Nova-3 / Flux | Streaming | $0.462/hr before add-ons | Adapter needed | Low latency and voice-agent ergonomics |
| OpenAI | GPT-4o mini transcribe | Batch | $0.18/hr | Adapter needed | Cheap batch fallback |
| Google Cloud | STT V2 Dynamic Batch | Batch | $0.18/hr | Adapter needed | Cheap batch fallback |
| Rev AI | Reverb Turbo | Batch | $0.10/hr | Adapter needed | English batch benchmark |
| AWS | Transcribe Standard | Streaming/batch | $1.44/hr | Adapter needed | Compliance/enterprise fallback, not cost-led |

## Pricing Sources

- AssemblyAI pricing: https://www.assemblyai.com/pricing/
- Deepgram pricing: https://deepgram.com/pricing
- Gladia pricing support article: https://support.gladia.io/article/understanding-our-transcription-pricing-pv1atikh8y9c8sw7sudm3rcy
- Speechmatics pricing: https://www.speechmatics.com/pricing
- OpenAI pricing: https://developers.openai.com/api/docs/pricing
- Google Cloud Speech-to-Text pricing: https://cloud.google.com/speech-to-text/pricing
- AWS Transcribe pricing: https://aws.amazon.com/transcribe/pricing/
- Soniox pricing: https://soniox.com/pricing
- ElevenLabs API pricing: https://elevenlabs.io/pricing/api
- Rev AI pricing: https://www.rev.ai/pricing

## Benchmark Sources

- Artificial Analysis AA-WER v2.0: https://artificialanalysis.ai/articles/aa-wer-v2
- Speechmatics summary of Pipecat realtime STT evals: https://www.speechmatics.com/company/articles-and-news/speed-you-can-trust-the-stt-metrics-that-matter-for-voice-agents
- Realtime voice-agent architecture paper: https://arxiv.org/abs/2603.05413
- Real-world STT reliability caveat: https://arxiv.org/abs/2602.12249

Interpretation:

- Artificial Analysis ranks ElevenLabs Scribe v2 first overall in AA-WER v2.0 and reports AssemblyAI Universal-3 Pro as a strong voice-agent subset performer.
- The Pipecat table favors Speechmatics on pooled semantic WER, Deepgram on median realtime latency, and AssemblyAI on a balanced latency/cost path.
- The 2026 arXiv voice-agent tutorial reinforces that cascaded STT -> LLM -> TTS remains the practical architecture for realtime systems today.
- The street-name reliability paper is a reminder that low benchmark WER does not eliminate domain-specific failure, so Layer One still needs its own meeting/intake golden set.

## Adapter Order

1. Soniox realtime: lowest public cost, likely best pressure test for margins.
2. ElevenLabs Scribe v2 Realtime: quality benchmark leader to compare against the current feel.
3. Speechmatics Pro: strong Pipecat accuracy/latency balance.
4. Deepgram Nova-3 or Flux: realtime operational ergonomics and generous evaluation credit.

Do not expose these in user settings until each adapter can pass live auth, stream, finalization, diarization, and quota-cost tests.
