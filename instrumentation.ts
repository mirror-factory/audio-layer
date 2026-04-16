/**
 * Next.js Instrumentation
 *
 * This file is auto-loaded by Next.js to set up OpenTelemetry.
 * Langfuse receives all AI SDK traces automatically.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/langfuse-setup');
  }
}
