/**
 * Next.js instrumentation — Node.js only.
 * Lazy-loads Langfuse OTel from server/ directory to keep
 * @opentelemetry/* out of the Edge middleware bundle.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureLangfuse } = await import("./server/langfuse-setup");
    await ensureLangfuse();
  } catch {
    // Langfuse not configured or missing deps — continue without OTel
  }
}
