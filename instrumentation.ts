/**
 * Next.js instrumentation — runtime dispatcher.
 *
 * Next.js calls this for BOTH Node.js and Edge runtimes.
 * We only want OTel/Langfuse in Node.js, so we guard and
 * use a fully dynamic import to prevent Edge bundling.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import with a variable prevents Vercel's Edge bundler
    // from statically analyzing and including the OTel modules.
    const modulePath = "./lib/langfuse-setup";
    try {
      await import(/* webpackIgnore: true */ modulePath);
    } catch {
      // Langfuse not configured or SDK missing — continue without OTel
    }
  }
}
