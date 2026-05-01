/**
 * Vercel AI Gateway / AI SDK mock harness (PROD-331).
 *
 * Covers the operations called out in V1_PLAN.md §8:
 *   - summary       (generateText)
 *   - intake        (generateObject)
 *   - chat          (streamText)
 *   - embeddings    (embed / embedMany)
 *
 * These are the four `ai` SDK entry points the app uses. The mocks are
 * deliberately minimal -- enough surface to let route tests assert call
 * shape and tweak return values per case. Tests that need richer streaming
 * fakes can override individual fns via `mockImplementation`.
 */
import { vi, type Mock } from "vitest";

type AnyFn = (...args: any[]) => any;

export interface AIGatewayMock {
  generateText: Mock<AnyFn>;
  generateObject: Mock<AnyFn>;
  streamText: Mock<AnyFn>;
  embed: Mock<AnyFn>;
  embedMany: Mock<AnyFn>;
  /** Mock for `@ai-sdk/gateway#gateway` -- returns a model id-tagged stub. */
  gateway: Mock<AnyFn>;
  reset: () => void;
}

const DEFAULT_USAGE = {
  inputTokens: 100,
  outputTokens: 50,
  totalTokens: 150,
};

function defaultStream(text: string) {
  // Minimal AsyncIterable that yields one text chunk and resolves the
  // common terminal promises consumers await.
  async function* textStream() {
    yield text;
  }
  return {
    textStream: textStream(),
    text: Promise.resolve(text),
    usage: Promise.resolve(DEFAULT_USAGE),
    finishReason: Promise.resolve("stop"),
    toUIMessageStreamResponse: () =>
      new Response(text, {
        headers: { "content-type": "text/plain" },
      }),
  };
}

export function mockAIGateway(): AIGatewayMock {
  const generateText = vi.fn(async () => ({
    text: "Mock summary from AI Gateway.",
    usage: DEFAULT_USAGE,
    finishReason: "stop",
    toolCalls: [],
  }));

  const generateObject = vi.fn(async () => ({
    object: {
      intent: "mock conversation",
      primaryParticipant: null,
      organization: null,
      contactInfo: { email: null, phone: null },
      budgetMentioned: null,
      timeline: null,
      decisionMakers: [],
      requirements: [],
      painPoints: [],
      nextSteps: [],
    },
    usage: DEFAULT_USAGE,
    finishReason: "stop",
  }));

  const streamText = vi.fn(() => defaultStream("Mock chat response."));

  const embed = vi.fn(async () => ({
    embedding: new Array(1536).fill(0).map((_, i) => (i % 7) / 7 - 0.5),
    usage: { tokens: 8 },
  }));

  const embedMany = vi.fn(async ({ values }: { values: string[] }) => ({
    embeddings: values.map(() =>
      new Array(1536).fill(0).map((_, i) => (i % 7) / 7 - 0.5),
    ),
    usage: { tokens: values.length * 8 },
  }));

  // `gateway('openai/gpt-4o-mini')` returns a stub object the SDK passes
  // back into the call. Tests rarely need to inspect it.
  const gateway = vi.fn((modelId: string) => ({
    modelId,
    provider: "ai-gateway-mock",
    specificationVersion: "v2",
  }));

  function reset() {
    generateText.mockReset();
    generateObject.mockReset();
    streamText.mockReset();
    embed.mockReset();
    embedMany.mockReset();
    gateway.mockReset();
    // restore defaults
    generateText.mockResolvedValue({
      text: "Mock summary from AI Gateway.",
      usage: DEFAULT_USAGE,
      finishReason: "stop",
      toolCalls: [],
    });
    generateObject.mockResolvedValue({
      object: {
        intent: "mock conversation",
        primaryParticipant: null,
        organization: null,
        contactInfo: { email: null, phone: null },
        budgetMentioned: null,
        timeline: null,
        decisionMakers: [],
        requirements: [],
        painPoints: [],
        nextSteps: [],
      },
      usage: DEFAULT_USAGE,
      finishReason: "stop",
    });
    streamText.mockImplementation(() => defaultStream("Mock chat response."));
    embed.mockResolvedValue({
      embedding: new Array(1536).fill(0).map((_, i) => (i % 7) / 7 - 0.5),
      usage: { tokens: 8 },
    });
    embedMany.mockImplementation(async ({ values }: { values: string[] }) => ({
      embeddings: values.map(() =>
        new Array(1536).fill(0).map((_, i) => (i % 7) / 7 - 0.5),
      ),
      usage: { tokens: values.length * 8 },
    }));
    gateway.mockImplementation((modelId: string) => ({
      modelId,
      provider: "ai-gateway-mock",
      specificationVersion: "v2",
    }));
  }

  return { generateText, generateObject, streamText, embed, embedMany, gateway, reset };
}

/**
 * Recommended wiring (vi.mock must be at the top level of the test file):
 *
 *   import { vi, beforeEach } from "vitest";
 *   import { mockAIGateway } from "@/tests/mocks/ai-gateway";
 *
 *   const ai = mockAIGateway();
 *   vi.mock("ai", async (importOriginal) => {
 *     const actual = await importOriginal<typeof import("ai")>();
 *     return {
 *       ...actual,
 *       generateText: ai.generateText,
 *       generateObject: ai.generateObject,
 *       streamText: ai.streamText,
 *       embed: ai.embed,
 *       embedMany: ai.embedMany,
 *     };
 *   });
 *   vi.mock("@ai-sdk/gateway", () => ({ gateway: ai.gateway }));
 *
 *   beforeEach(() => ai.reset());
 */
