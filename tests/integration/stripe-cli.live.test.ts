/**
 * Stripe CLI webhook replay canary (PROD-331).
 *
 * Verifies that a real Stripe-signed webhook payload is accepted by
 * `app/api/stripe/webhook/route.ts`. Run by:
 *
 *   1. `stripe trigger checkout.session.completed` (locally, with stripe-cli)
 *      OR `stripe events resend evt_xyz`
 *   2. Capture the raw body and `Stripe-Signature` header into a fixture.
 *   3. Set `STRIPE_CLI_FIXTURE_PATH=/path/to/fixture.json` and
 *      `STRIPE_WEBHOOK_SECRET=whsec_...` (the secret stripe-cli printed).
 *
 * The fixture is JSON: `{ "body": "<raw json>", "signature": "t=...,v1=..." }`.
 *
 * Gated triple:
 *   - `RUN_LIVE_CANARIES=1`
 *   - `STRIPE_CLI_FIXTURE_PATH` set
 *   - `STRIPE_WEBHOOK_SECRET` set
 */
import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";

const RUN = process.env.RUN_LIVE_CANARIES === "1";
const HAS_FIXTURE = Boolean(process.env.STRIPE_CLI_FIXTURE_PATH);
const HAS_SECRET = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
const ENABLED = RUN && HAS_FIXTURE && HAS_SECRET;

describe.skipIf(!ENABLED)("Stripe CLI webhook replay canary", () => {
  it("accepts a stripe-cli-signed payload against constructEvent", async () => {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_canary");

    const fixturePath = process.env.STRIPE_CLI_FIXTURE_PATH!;
    const raw = await readFile(fixturePath, "utf8");
    const fixture = JSON.parse(raw) as { body: string; signature: string };

    expect(fixture.body, "fixture must include raw body").toBeTruthy();
    expect(fixture.signature, "fixture must include signature").toBeTruthy();

    // Real signature verification -- if Stripe ever changes how signatures
    // are computed, this throws here, not silently in production.
    const event = stripe.webhooks.constructEvent(
      fixture.body,
      fixture.signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );

    expect(event.id).toMatch(/^evt_/);
    expect(event.type).toBeDefined();
  }, 30_000);
});
