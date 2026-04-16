/**
 * Langfuse Observability Setup
 *
 * Wires Langfuse into AI SDK v6 via OpenTelemetry.
 * Every generateText/streamText call is automatically traced.
 *
 * Setup:
 *   1. npm install @langfuse/otel @opentelemetry/sdk-node
 *   2. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY in .env
 *   3. Import this file at app startup (e.g., instrumentation.ts)
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';

const sdk = new NodeSDK({
  spanProcessors: [
    new LangfuseSpanProcessor({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com',
    }),
  ],
});

sdk.start();

export { sdk };
