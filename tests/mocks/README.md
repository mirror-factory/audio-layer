## Vendor mock harness (PROD-331)

Reusable Vitest mocks for the four external vendors the app talks to. Each
mock module exports:

- A `vi.fn()` per AC-listed operation (so tests can assert calls and tweak
  return values per case).
- A `setup()` helper that wires the mocks into `vi.mock()` for the canonical
  client paths (`@/lib/assemblyai/client`, etc.).
- A `reset()` helper that calls `mockReset()` on every fn so suites don't
  bleed state.

The mocks deliberately cover **only** the operations called out in the
PROD-331 acceptance criteria (V1_PLAN.md §8). They are not full SDK fakes:

- AssemblyAI: upload, transcript submit, transcript poll, realtime token,
  streaming finalization.
- AI Gateway: summary (`generateText`), intake extraction (`generateObject`),
  chat (`streamText`), embeddings.
- Stripe: checkout session, customer portal, webhook signature events.
- Resend: send success, send failure, rate limit.

### Live canary plan

Live-vendor smoke tests live alongside under
`tests/integration/<vendor>.live.test.ts` and are gated behind
`describe.skipIf(!process.env.RUN_LIVE_CANARIES)`. They are skipped in
`pnpm test` and intended for nightly/manual GH Actions runs:

| canary                       | env required                        |
| ---------------------------- | ----------------------------------- |
| `assemblyai.live.test.ts`    | `RUN_LIVE_CANARIES`, `ASSEMBLYAI_API_KEY` |
| `ai-gateway.live.test.ts`    | `RUN_LIVE_CANARIES`, `AI_GATEWAY_API_KEY` |
| `stripe-cli.live.test.ts`    | `RUN_LIVE_CANARIES`, `STRIPE_CLI_FIXTURE_PATH` |
| `supabase-rls.live.test.ts`  | `RUN_LIVE_CANARIES`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

### Usage

`vi.mock(...)` must live at the top level of the test file (Vitest 4 hoists
it; future versions will error if it isn't top-level). Use the factories
below to build the fake clients, then wire them into `vi.mock` yourself:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAssemblyAI } from "@/tests/mocks/assemblyai";

const aai = mockAssemblyAI();

vi.mock("@/lib/assemblyai/client", () => ({
  getAssemblyAI: aai.getAssemblyAI,
}));

beforeEach(() => aai.reset());

it("submits a transcript", async () => {
  aai.transcripts.submit.mockResolvedValueOnce({ id: "tr_1", status: "queued" });
  // ... call route under test ...
  expect(aai.transcripts.submit).toHaveBeenCalledOnce();
});
```

Each mock module's JSDoc has the exact `vi.mock(...)` snippet to copy.
