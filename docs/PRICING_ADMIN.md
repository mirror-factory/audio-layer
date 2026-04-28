# Pricing Admin

`/admin/pricing` is an internal pricing sandbox for plan and vendor economics.
It is guarded by the same `DEV_KIT_DASHBOARD_SECRET` middleware used by
`/dev-kit` in production, and is open in local development.

## What It Models

- STT provider and model cost, normalized to USD per hour.
- STT add-ons such as AssemblyAI speaker diarization.
- Plan price, included minutes, expected minutes, and overage rate.
- LLM cost per meeting.
- Platform, support, and payment processing costs.
- Gross profit, gross margin, target price, and break-even minutes per plan.
- A 1,000-customer plan-mix scenario with MRR, ARR, ARPU, paid accounts,
  monthly cost, monthly profit, and portfolio gross margin.
- Provider cost conversions for a 30-minute meeting, the Core plan cap, and a
  1,000-user Core-cap load.

## Current STT Alternatives

The catalog lives in `lib/billing/stt-pricing.ts`.

| Provider | Best use | Pricing note |
| --- | --- | --- |
| AssemblyAI | Current runtime default; good realtime and batch API coverage | Universal Streaming Multilingual is the base live default at $0.15/hr; realtime diarization stays optional. |
| Soniox | Cheapest public realtime candidate | Realtime is modeled at about $0.12/hr; requires a provider adapter and meeting-quality eval. |
| Deepgram | Realtime fallback with strong latency profile and larger free credit | Nova-3, Nova-2, and Flux require speaker diarization as an add-on in the current public price model. |
| Gladia | Bundled features and multilingual coverage | Growth pricing is attractive but requires usage commitment. |
| Speechmatics | Accuracy/latency benchmark candidate | Public rate is "from" pricing; validate before committing. |
| ElevenLabs | Quality benchmark candidate | Scribe v2 Realtime is modeled at $0.39/hr. |
| Rev AI | Low-cost English batch candidate | Reverb Turbo is modeled at $0.10/hr. |
| OpenAI | Batch fallback for cheap transcription | GPT-4o transcribe diarize is modeled at the same $0.006/min estimate as GPT-4o transcribe. |
| Google Cloud | Cheap dynamic batch option | Not suitable as the live meeting default. |
| AWS Transcribe | Enterprise/compliance fallback | Significantly more expensive at tier-1 rates. |

The current provider matrix and benchmark interpretation live in
`docs/TRANSCRIPTION_PROVIDER_MATRIX.md`.

## Operational Notes

- The page now persists versioned pricing configs. `Save draft` records an
  editable snapshot; `Save & activate` makes that snapshot the active config
  read by quota checks and `/usage`.
- Persistence uses Supabase table `pricing_config_versions` when available,
  and falls back to `.ai-dev-kit/pricing-config.json` in local development.
- Any production price change still needs a matching Stripe price ID update.
- With the default plan mix of 250 free, 650 Core, and 100 Pro users,
  `/admin/pricing` should show more than $10k MRR. A flat 1,000 Core users is
  $15k MRR before usage costs.
- If the STT provider changes, update `lib/billing/stt-pricing.ts`,
  `lib/billing/assemblyai-pricing.ts` or the new provider estimator, and the
  vendor registry source URLs together.
- The default live pricing config intentionally keeps `addonIds` empty so the
  default recorder economics match the $0.15/hr Universal Streaming
  Multilingual base rate. Add realtime speaker diarization explicitly only when
  the margin plan can absorb the extra $0.12/hr.
- Runtime settings intentionally expose only implemented AssemblyAI models.
  Candidate providers stay in `/admin/pricing` until their auth, streaming,
  finalization, diarization, and cost tests pass.
- `/api/transcribe/stream/preflight` reads the active pricing config to show
  the recorder which provider/model/cost source is active before creating a
  meeting or paid STT token.
- Local unlimited mode is controlled by `LAYER_ONE_BYPASS_QUOTA=true` in
  `.env.local`. It bypasses meeting and minute limits without changing Stripe
  subscription state. Production ignores this flag unless
  `LAYER_ONE_ALLOW_PROD_QUOTA_BYPASS=true` is also set.
- `/api/admin/pricing` and `/api/admin/pricing/activate` are guarded by the
  same `DEV_KIT_DASHBOARD_SECRET` middleware path as `/admin` and `/dev-kit`
  in production.
