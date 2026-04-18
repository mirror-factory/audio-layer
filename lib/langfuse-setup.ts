/**
 * Langfuse Observability Setup — serverless-safe.
 *
 * Why this file exists AND the `flushLangfuse()` export:
 *
 * On Vercel serverless the function process freezes the moment the
 * HTTP response is sent, which leaves OpenTelemetry span processors
 * with buffered spans that never upload. Result: Langfuse shows
 * traces with zero tokens / zero cost. The documented fix (per
 * langfuse.com/docs/integrations/vercel-ai-sdk) is to export the
 * processor and call `forceFlush()` inside Next.js's `after()`
 * helper after every AI-calling route.
 *
 * Setup:
 *   1. pnpm add @langfuse/otel @opentelemetry/sdk-node
 *   2. LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY in env
 *   3. instrumentation.ts imports this module — Next.js loads it
 *      once per Node process
 *   4. AI-calling routes end with:
 *        import { after } from "next/server";
 *        after(flushLangfuse);
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

const isConfigured =
  Boolean(process.env.LANGFUSE_PUBLIC_KEY) &&
  Boolean(process.env.LANGFUSE_SECRET_KEY);

let langfuseSpanProcessor: LangfuseSpanProcessor | null = null;
let sdk: NodeSDK | null = null;

if (isConfigured) {
  langfuseSpanProcessor = new LangfuseSpanProcessor({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
  });

  sdk = new NodeSDK({
    spanProcessors: [langfuseSpanProcessor],
  });
  sdk.start();
}

/**
 * Force-flush any pending Langfuse spans before the current request
 * freezes. Safe to call from a Next.js App Router route with:
 *
 *   import { after } from "next/server";
 *   after(flushLangfuse);
 *
 * No-op when Langfuse isn't configured. Swallows errors so a
 * Langfuse outage can't take down a user-facing request.
 */
export async function flushLangfuse(): Promise<void> {
  if (!langfuseSpanProcessor) return;
  try {
    await langfuseSpanProcessor.forceFlush();
  } catch (err) {
    console.error("[langfuse] forceFlush failed", err);
  }
}

export { sdk, langfuseSpanProcessor };
