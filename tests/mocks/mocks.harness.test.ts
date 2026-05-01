/**
 * Self-tests for the vendor mock harness (PROD-331).
 *
 * These tests verify the mock factories themselves -- they make sure each
 * default behavior matches the AC-listed operations, and that reset() leaves
 * the mocks usable across test cases. Routes that consume the mocks via the
 * `setup*Mock()` helpers are covered separately.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { mockAssemblyAI } from "./assemblyai";
import { mockAIGateway } from "./ai-gateway";
import { mockStripe } from "./stripe";
import { mockResend } from "./resend";

describe("mockAssemblyAI", () => {
  const aai = mockAssemblyAI();
  beforeEach(() => aai.reset());

  it("uploads, submits, polls, mints realtime + streaming tokens", async () => {
    const url = await aai.files.upload();
    expect(url).toMatch(/cdn\.assemblyai\.com/);

    const submit = await aai.transcripts.submit();
    expect(submit).toMatchObject({ status: "queued" });

    const poll = await aai.transcripts.get("tr_x");
    expect(poll).toMatchObject({ id: "tr_x", status: "completed" });

    const ready = await aai.transcripts.waitUntilReady("tr_x");
    expect(ready.status).toBe("completed");

    const rt = await aai.realtime.createTemporaryToken();
    expect(rt.token).toBe("rt_token_mock");

    const stream = await aai.streaming.createToken();
    expect(stream.token).toBe("stream_token_mock");
  });

  it("getAssemblyAI returns the fake client", () => {
    const c = aai.getAssemblyAI();
    expect(c).toBe(aai.client);
  });
});

describe("mockAIGateway", () => {
  const ai = mockAIGateway();
  beforeEach(() => ai.reset());

  it("covers summary, intake, chat, and embeddings", async () => {
    const summary = await ai.generateText({ prompt: "x" });
    expect(summary.text).toMatch(/Mock summary/);

    const intake = await ai.generateObject({ prompt: "x" });
    expect(intake.object.intent).toBe("mock conversation");

    const chat = ai.streamText({ prompt: "x" });
    const text = await chat.text;
    expect(text).toBe("Mock chat response.");

    const single = await ai.embed({ value: "x" });
    expect(single.embedding).toHaveLength(1536);

    const many = await ai.embedMany({ values: ["a", "b", "c"] });
    expect(many.embeddings).toHaveLength(3);
    expect(many.embeddings[0]).toHaveLength(1536);
  });

  it("gateway() tags the model id", () => {
    const m = ai.gateway("openai/gpt-4o-mini");
    expect(m).toMatchObject({ modelId: "openai/gpt-4o-mini" });
  });
});

describe("mockStripe", () => {
  const stripe = mockStripe();
  beforeEach(() => stripe.reset());

  it("creates a checkout session", async () => {
    const session = await stripe.checkout.sessions.create();
    expect(session.url).toMatch(/checkout\.stripe\.com/);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledOnce();
  });

  it("creates a billing portal session", async () => {
    const session = await stripe.billingPortal.sessions.create();
    expect(session.url).toMatch(/billing\.stripe\.com/);
  });

  it("constructEvent parses the raw body as the webhook payload", () => {
    const body = JSON.stringify({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { id: "cs_1" } },
    });
    const event = stripe.webhooks.constructEvent(body, "sig", "whsec");
    expect(event).toMatchObject({ type: "checkout.session.completed" });
  });

  it("buildEvent produces a Stripe.Event-shaped payload", () => {
    const evt = stripe.buildEvent("invoice.paid", { id: "in_1" });
    expect(evt).toMatchObject({
      type: "invoice.paid",
      object: "event",
      data: { object: { id: "in_1" } },
    });
  });

  it("constructEvent can be made to throw to simulate signature failure", () => {
    stripe.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error("No signatures found matching the expected signature");
    });
    expect(() =>
      stripe.webhooks.constructEvent("body", "sig", "whsec"),
    ).toThrow(/No signatures found/);
  });
});

describe("mockResend", () => {
  const resend = mockResend();
  beforeEach(() => resend.reset());

  it("returns a successful send by default", async () => {
    const result = await resend.emails.send({});
    expect(result).toMatchObject({ data: { id: "email_mock_id" }, error: null });
  });

  it("setSuccess(id) overrides the next send", async () => {
    resend.setSuccess("email_custom_id");
    const result = await resend.emails.send({});
    expect(result.data?.id).toBe("email_custom_id");
  });

  it("setFailure exposes a generic application error", async () => {
    resend.setFailure("downstream blew up");
    const result = await resend.emails.send({});
    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({
      name: "application_error",
      statusCode: 500,
      message: "downstream blew up",
    });
  });

  it("setRateLimit produces a 429 error", async () => {
    resend.setRateLimit();
    const result = await resend.emails.send({});
    expect(result.error).toMatchObject({
      name: "rate_limit_exceeded",
      statusCode: 429,
    });
  });
});
