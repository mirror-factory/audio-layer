/**
 * Flush Langfuse spans. Used with Next.js after() in API routes.
 * Lazy-initializes Langfuse on first call.
 */
export async function flushLangfuse(): Promise<void> {
  try {
    // Lazy init — only imports OTel in Node.js runtime
    const { ensureLangfuse } = await import("../server/langfuse-setup");
    await ensureLangfuse();
  } catch {
    // Not available (Edge runtime, missing deps) — no-op
  }
}
