/**
 * Text chunking for embedding pipelines.
 * Splits text into ~500 token chunks with word-level overlap.
 */

const DEFAULT_MAX_TOKENS = 500;
const OVERLAP_WORDS = 50;
const AVG_CHARS_PER_TOKEN = 4;

/**
 * Split text into chunks of approximately `maxTokens` tokens.
 * Uses word boundaries with overlap between consecutive chunks
 * so semantic context isn't lost at boundaries.
 */
export function chunkText(text: string, maxTokens = DEFAULT_MAX_TOKENS): string[] {
  if (!text || text.trim().length === 0) return [];

  const words = text.split(/\s+/).filter(Boolean);
  const maxWords = Math.floor((maxTokens * AVG_CHARS_PER_TOKEN) / 5);

  if (words.length <= maxWords) {
    return [words.join(" ")];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    const chunk = words.slice(start, end).join(" ");
    chunks.push(chunk);

    if (end >= words.length) break;
    start = end - OVERLAP_WORDS;
    if (start <= (chunks.length > 1 ? end - maxWords + OVERLAP_WORDS : 0)) {
      start = end - OVERLAP_WORDS;
    }
  }

  return chunks;
}

/**
 * Rough token count estimate for cost tracking.
 * OpenAI's tokenizer averages ~4 chars per token for English text.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN);
}
