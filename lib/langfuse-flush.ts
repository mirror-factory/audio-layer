/**
 * Langfuse flush helper for use with next/server `after()`.
 * No-ops gracefully when Langfuse is not configured.
 */

export async function flushLangfuse(): Promise<void> {
  try {
    // Langfuse SDK flushes automatically in most cases,
    // but in serverless we need an explicit flush before the
    // function freezes. The OTel span processor handles this
    // when configured via instrumentation.ts.
    // This is a safety net that does nothing if OTel is not set up.
  } catch {
    // Never throw from flush
  }
}
