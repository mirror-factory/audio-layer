/**
 * Langfuse OTel setup — lazy singleton.
 * Called from flushLangfuse() or first AI call, NOT from instrumentation.
 * Lives in server/ to stay out of Vercel's Edge bundler scan.
 */
let initialized = false;

export async function ensureLangfuse(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!publicKey || !secretKey) return;

  try {
    const [{ NodeSDK }, { LangfuseSpanProcessor }] = await Promise.all([
      import("@opentelemetry/sdk-node"),
      import("@langfuse/otel"),
    ]);

    const sdk = new NodeSDK({
      spanProcessors: [
        new LangfuseSpanProcessor({
          publicKey,
          secretKey,
          baseUrl: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
        }),
      ],
    });

    sdk.start();
  } catch (err) {
    console.error("[langfuse] init failed:", err);
  }
}
