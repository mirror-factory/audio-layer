/**
 * AI Gateway live canary (PROD-331).
 *
 * Issues one tiny `generateText` summary call through the Vercel AI Gateway.
 * Catches Gateway routing changes, model deprecations, and auth breakage
 * that the mock harness can't see.
 *
 * Gated double:
 *   - `RUN_LIVE_CANARIES=1` to opt in (skipped from default `pnpm test`)
 *   - `AI_GATEWAY_API_KEY` (or upstream provider key, depending on routing)
 *     must be set
 */
import { describe, it, expect } from "vitest";

const RUN = process.env.RUN_LIVE_CANARIES === "1";
const HAS_KEY = Boolean(
  process.env.AI_GATEWAY_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY,
);
const ENABLED = RUN && HAS_KEY;

describe.skipIf(!ENABLED)("AI Gateway live canary", () => {
  it("generates a one-sentence summary against the live gateway", async () => {
    const { generateText } = await import("ai");
    const { gateway } = await import("@ai-sdk/gateway");

    const modelId =
      process.env.AI_GATEWAY_CANARY_MODEL ?? "openai/gpt-4o-mini";

    const result = await generateText({
      model: gateway(modelId),
      prompt:
        "Summarize this in exactly one sentence: 'The quick brown fox jumps over the lazy dog.'",
    });

    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.usage?.outputTokens ?? 0).toBeGreaterThan(0);
  }, 60_000);
});
