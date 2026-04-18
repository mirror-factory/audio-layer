/**
 * withExternalCall -- wrap non-AI-SDK external API calls for observability.
 *
 * AI SDK calls (`streamText`, `generateText`) are captured automatically by
 * the Langfuse OpenTelemetry integration. Everything else -- AssemblyAI,
 * Firecrawl, Deepgram, the Vercel API, any REST SDK -- is invisible to
 * Langfuse out of the box.
 *
 * This helper closes that gap. Wrap every external call so it:
 *   1. Logs structured start/end/error to the stdout sink
 *   2. Emits a Langfuse generation span when Langfuse is configured
 *      (silently no-ops when it isn't)
 *   3. Records duration, input summary, output summary
 *
 * Usage:
 *   const transcript = await withExternalCall(
 *     { vendor: 'assemblyai', operation: 'transcripts.submit', requestId },
 *     () => client.transcripts.submit({ audio_url, speech_models: ['universal-3-pro'] }),
 *     { inputSummary: { audioBytes: buf.length } },
 *   );
 *
 * If the call throws, the error is logged with full context and re-thrown
 * so upstream `withRoute()` can catch it. Never silences errors.
 */

import { log, toErrObject } from './logger';

interface ExternalCallMeta {
  vendor: string;       // 'assemblyai', 'firecrawl', etc.
  operation: string;    // 'transcripts.submit', 'scrape.url', etc.
  requestId?: string;
  userId?: string;
}

interface CallOptions<TResult> {
  inputSummary?: Record<string, unknown>;
  /** Summarize the result for logging (don't log full payloads). */
  summarizeResult?: (result: TResult) => Record<string, unknown>;
}

// Langfuse is optional -- resolve it dynamically so the helper works with or
// without it installed. The `any` cast here is intentional: we only use the
// client if it successfully resolves and exposes `.generation()`.
let langfuseClient: unknown = null;
let langfuseInitAttempted = false;

async function getLangfuse(): Promise<{ generation: (args: Record<string, unknown>) => { end: (args?: Record<string, unknown>) => void; update: (args?: Record<string, unknown>) => void } } | null> {
  if (langfuseInitAttempted) return langfuseClient as ReturnType<typeof getLangfuse> extends Promise<infer T> ? T : never;
  langfuseInitAttempted = true;

  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    return null;
  }

  try {
    const mod = await import('langfuse').catch(() => null);
    if (!mod) return null;
    const Langfuse = (mod as { Langfuse?: new (args: Record<string, unknown>) => unknown }).Langfuse;
    if (!Langfuse) return null;
    langfuseClient = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com',
    });
    return langfuseClient as ReturnType<typeof getLangfuse> extends Promise<infer T> ? T : never;
  } catch (err) {
    log.warn('langfuse.init-failed', { err: toErrObject(err) });
    return null;
  }
}

export async function withExternalCall<TResult>(
  meta: ExternalCallMeta,
  fn: () => Promise<TResult>,
  options: CallOptions<TResult> = {},
): Promise<TResult> {
  const startedAt = Date.now();
  const { vendor, operation, requestId, userId } = meta;

  log.info('external.start', { vendor, operation, requestId, userId, input: options.inputSummary });

  const lf = await getLangfuse().catch(() => null);
  const span = lf?.generation({
    name: `${vendor}.${operation}`,
    metadata: { vendor, operation, requestId, userId },
    input: options.inputSummary ?? null,
  });

  try {
    const result = await fn();
    const durationMs = Date.now() - startedAt;
    const output = options.summarizeResult ? safeSummarize(options.summarizeResult, result) : undefined;

    log.info('external.end', { vendor, operation, requestId, durationMs, output });
    span?.end({ output: output ?? null });
    return result;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const errObj = toErrObject(err);
    log.error('external.failed', { vendor, operation, requestId, durationMs, err: errObj });
    span?.update({ level: 'ERROR', statusMessage: errObj.message });
    span?.end();
    throw err;
  }
}

function safeSummarize<T>(summarize: (r: T) => Record<string, unknown>, result: T): Record<string, unknown> | undefined {
  try { return summarize(result); } catch { return undefined; }
}
