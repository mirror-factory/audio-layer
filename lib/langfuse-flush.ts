/**
 * Flush Langfuse spans. Used with Next.js after() in API routes.
 *
 * This is a no-op stub. Langfuse initialization happens lazily
 * via the AI SDK's built-in telemetry when env vars are set.
 * The flush is not needed with @opentelemetry/api (which we
 * bundle directly) — spans export automatically.
 */
export async function flushLangfuse(): Promise<void> {
  // No-op — OTel spans flush automatically via the SDK
}
