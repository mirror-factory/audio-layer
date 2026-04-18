/**
 * Chat API route — Vercel AI SDK v6 patterns.
 *
 * - streamText with AI Gateway
 * - 3 tools (searchDocuments server, askQuestion client, updateSettings server)
 * - Full telemetry: trace id, timing, tokens, cost, tools, finish reason, errors
 * - toUIMessageStreamResponse() for client transport
 * - convertToModelMessages() to convert UIMessage[] to ModelMessage[]
 */

import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { after } from "next/server";
import { gateway } from "@ai-sdk/gateway";
import { allTools } from "@/lib/ai/tools";
import {
  withTelemetry,
  logAICall,
  logError,
  type TelemetryContext,
} from "@/lib/ai/telemetry";
import { flushLangfuse } from "@/lib/langfuse-setup";

const MODEL_ID = "openai/gpt-5.4-nano";

export async function POST(req: Request) {
  const startTime = Date.now();
  let firstTokenTime: number | null = null;

  const telemetryContext: TelemetryContext = {
    userId: "anonymous",
    sessionId: "default",
    chatId: "default",
    label: "chat",
  };

  try {
    const body = await req.json();
    const messages = (body.messages ?? []) as UIMessage[];

    if (!messages.length) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Convert UI messages to model messages (async in v6)
    const modelMessages = await convertToModelMessages(messages, {
      tools: allTools,
    });

    // Track tool calls during streaming
    const toolCallNames: string[] = [];

    const result = streamText({
      model: gateway(MODEL_ID),
      system: `You are a helpful assistant in a reference app for the Vercel AI SDK v6 starter kit.

You have 3 tools available:
- searchDocuments: Search the knowledge base. Use when the user asks to find or look up information.
- askQuestion: Ask the user a multiple-choice question. Use when you need the user to pick from options.
- updateSettings: Update a configuration value. Use when the user asks to change a setting.

Be concise. Use tools when appropriate.`,
      messages: modelMessages,
      tools: allTools,
      ...withTelemetry(telemetryContext),
      onChunk: ({ chunk }) => {
        // Capture time-to-first-token
        if (firstTokenTime === null && chunk.type === "text-delta") {
          firstTokenTime = Date.now();
        }
        // Track tool calls
        if (chunk.type === "tool-call") {
          toolCallNames.push(chunk.toolName);
        }
      },
      onFinish: ({ usage, finishReason }) => {
        const durationMs = Date.now() - startTime;
        const ttftMs =
          firstTokenTime !== null ? firstTokenTime - startTime : null;

        logAICall({
          context: telemetryContext,
          modelId: MODEL_ID,
          durationMs,
          ttftMs,
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          toolCalls: toolCallNames,
          finishReason: finishReason ?? null,
          error: null,
        });
      },
      onError: ({ error }) => {
        const durationMs = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        logAICall({
          context: telemetryContext,
          modelId: MODEL_ID,
          durationMs,
          inputTokens: 0,
          outputTokens: 0,
          toolCalls: toolCallNames,
          finishReason: "error",
          error: errorMessage,
        });

        logError({
          context: telemetryContext,
          error,
          source: "chat-route",
          modelId: MODEL_ID,
        });
      },
    });

    // Flush spans after the stream ends so Langfuse captures token
    // + cost data before the Vercel function freezes.
    after(flushLangfuse);
    return result.toUIMessageStreamResponse();
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logAICall({
      context: telemetryContext,
      modelId: MODEL_ID,
      durationMs,
      inputTokens: 0,
      outputTokens: 0,
      finishReason: "error",
      error: errorMessage,
    });

    logError({
      context: telemetryContext,
      error,
      source: "chat-route",
      modelId: MODEL_ID,
    });

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
