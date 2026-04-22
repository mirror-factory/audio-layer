/**
 * Embedding client -- calls AI Gateway for text-embedding-3-small vectors.
 * Wrapped with withExternalCall for observability.
 */

import { withExternalCall } from "@/lib/with-external";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/embeddings";

interface EmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { prompt_tokens: number; total_tokens: number };
}

/**
 * Embed a single text string into a 1536-dimensional vector.
 * Uses the AI Gateway's OpenAI-compatible endpoint.
 */
export async function embedText(
  text: string,
  requestId?: string,
): Promise<number[]> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error("AI_GATEWAY_API_KEY is not configured");
  }

  const result = await withExternalCall(
    {
      vendor: "openai",
      operation: "embeddings.create",
      modelId: EMBEDDING_MODEL,
      requestId,
    },
    async () => {
      const response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text,
          dimensions: EMBEDDING_DIMENSIONS,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `Embedding API returned ${response.status}: ${body.slice(0, 200)}`,
        );
      }

      return (await response.json()) as EmbeddingResponse;
    },
    {
      inputSummary: { textLength: text.length },
      summarizeResult: (r) => ({
        dimensions: r.data[0]?.embedding.length,
        totalTokens: r.usage.total_tokens,
      }),
    },
  );

  const vector = result.data[0]?.embedding;
  if (!vector || vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS}-dim vector, got ${vector?.length ?? 0}`,
    );
  }

  return vector;
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
