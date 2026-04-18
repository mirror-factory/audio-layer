/**
 * aiCall -- single-function wrapper combining withTelemetry + logAICall.
 *
 * Problem this solves: the manual pattern is
 *
 *   const model = withTelemetry(gateway(modelId), ctx);
 *   const result = await streamText({ model, prompt });
 *   // ... stream consumption ...
 *   await logAICall({ context: ctx, modelId, usage: ..., durationMs: ..., finishReason });
 *
 * Five lines of ceremony per call; easy to forget the logAICall on the end,
 * at which point /dev-kit/sessions shows nothing and cost tracking is zero.
 *
 * aiCall collapses both steps. It auto-creates the context, wraps the
 * model, runs the call, and schedules the logAICall when usage is
 * available. Works for streamText and generateText.
 *
 * Usage:
 *   import { aiCall } from '@/lib/ai-call';
 *   const { text, usage } = await aiCall({
 *     mode: 'generate',
 *     modelId: models.generator,
 *     prompt: 'Summarize: ' + transcript,
 *     label: 'summarize-meeting',
 *     userId,
 *   });
 *
 *   // Streaming:
 *   const stream = await aiCall({
 *     mode: 'stream',
 *     modelId: models.generator,
 *     messages,
 *     label: 'chat',
 *     userId,
 *   });
 *   // consume stream.textStream; the wrapper logs automatically when done.
 *
 * Doctor still enforces the underlying primitives: if a file calls
 * streamText directly without withTelemetry, the check still fires.
 * aiCall is the preferred entry point because forgetting logAICall
 * becomes impossible.
 */

import { streamText, generateText, type LanguageModel } from 'ai';
import { gateway } from './model-router';
import { withTelemetry, logAICall, logError, type TelemetryContext } from './ai/telemetry';
import { log, toErrObject } from './logger';

type GenerateArgs = Parameters<typeof generateText>[0];
type StreamArgs = Parameters<typeof streamText>[0];

type BaseArgs = {
  modelId: string;
  label: string;
  userId?: string;
  sessionId?: string;
  chatId?: string;
  metadata?: Record<string, string>;
};

type AiCallArgs =
  | ({ mode: 'generate' } & BaseArgs & Omit<GenerateArgs, 'model'>)
  | ({ mode: 'stream' } & BaseArgs & Omit<StreamArgs, 'model'>);

export async function aiCall(args: AiCallArgs) {
  const { mode, modelId, label, userId, sessionId, chatId, metadata, ...rest } = args;
  const ctx: TelemetryContext = {
    userId,
    sessionId,
    chatId: chatId ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `chat-${Date.now()}`),
    label,
    metadata,
  };
  const model = gateway(modelId);
  const telemetry = withTelemetry(ctx);
  const startedAt = Date.now();

  try {
    if (mode === 'generate') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await generateText({ model, ...telemetry, ...(rest as any) });
      logAICall({
        context: ctx,
        modelId,
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
        durationMs: Date.now() - startedAt,
        finishReason: result.finishReason,
        toolCalls: result.toolCalls?.map((t: { toolName: string }) => t.toolName) ?? [],
        error: null,
      });
      return result;
    }

    // Streaming path: wrap the result's finishing promise so logAICall
    // fires once the consumer has drained the stream.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = streamText({ model, ...telemetry, ...(rest as any) });

    // Fire-and-forget: once finishReason resolves, log.
    (async () => {
      try {
        const [finishReason, usage] = await Promise.all([result.finishReason, result.usage]);
        logAICall({
          context: ctx,
          modelId,
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          durationMs: Date.now() - startedAt,
          finishReason: String(finishReason ?? 'unknown'),
          error: null,
        });
      } catch (err) {
        log.error('ai-call.stream-finalize-failed', { label, err: toErrObject(err) });
      }
    })();

    return result;
  } catch (err) {
    await logError({ context: ctx, error: err, source: 'ai-call', modelId });
    throw err;
  }
}
