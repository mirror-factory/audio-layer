export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { after } from "next/server";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { withRoute } from "@/lib/with-route";
import { withTelemetry, logAICall, logError } from "@/lib/ai/telemetry";
import { allTools } from "@/lib/ai/tools";
import { flushLangfuse } from "@/lib/langfuse-flush";
import { getCurrentUserId } from "@/lib/supabase/user";

const SYSTEM_PROMPT = `You are a helpful assistant in a reference app for the Vercel AI SDK v6 starter kit.
You have 3 tools available:
- searchDocuments: Search the knowledge base.
- askQuestion: Ask the user a multiple-choice question.
- updateSettings: Update a configuration value.
Be concise. Use tools when appropriate.`;

export const POST = withRoute(async (req, ctx) => {
  const { messages } = (await req.json()) as { messages: UIMessage[] };

  const userId = (await getCurrentUserId()) ?? "anonymous";
  const chatId = ctx.requestId;
  const startTime = Date.now();
  let ttftMs: number | null = null;
  const toolCallNames: string[] = [];

  const telemetryCtx = {
    userId,
    chatId,
    label: "chat",
  };

  const model = withTelemetry(gateway("openai/gpt-5.4-nano"), telemetryCtx);
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: allTools,
    stopWhen: stepCountIs(5),
    onChunk: ({ chunk }) => {
      if (ttftMs === null && chunk.type === "text-delta") {
        ttftMs = Date.now() - startTime;
      }
    },
    onFinish: async ({ usage, finishReason, steps }) => {
      try {
        // Collect tool call names
        for (const step of steps) {
          if (step.toolCalls) {
            for (const tc of step.toolCalls) {
              toolCallNames.push(tc.toolName);
            }
          }
        }

        await logAICall({
          context: telemetryCtx,
          modelId: "openai/gpt-5.4-nano",
          usage: {
            promptTokens: usage.inputTokens ?? 0,
            completionTokens: usage.outputTokens ?? 0,
          },
          durationMs: Date.now() - startTime,
          ttftMs,
          steps: steps.length,
          toolCalls: toolCallNames,
          finishReason: finishReason ?? null,
        });
      } catch {
        // Don't let telemetry errors break the response
      }
    },
    onError: async ({ error }) => {
      await logError({
        context: telemetryCtx,
        error,
        source: "chat-route",
        modelId: "openai/gpt-5.4-nano",
      }).catch(() => {});
    },
  });

  // Flush Langfuse after response is sent
  after(flushLangfuse);

  return result.toUIMessageStreamResponse();
});
