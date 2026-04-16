export default function AIStarterHubPage() {
  return (
    <main className="min-h-dvh bg-neutral-950 px-6 py-8 text-neutral-100">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
            AI Starter Hub
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            This page explains what the starter added to the project.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
            Keep this route lightweight and honest. It should act as the human
            onboarding page and the AI handoff summary for the project.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
            <h2 className="text-sm font-semibold">Registry</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              The registry is the source of truth for tools, UI behavior, and
              generated docs and fixtures.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
            <h2 className="text-sm font-semibold">Verification</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Put your typecheck, tests, smoke checks, and visual checks behind
              one simple command and make it part of delivery.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
            <h2 className="text-sm font-semibold">Observability</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Route operators to the observability page so they can inspect AI
              calls, failures, cost, and latency after real usage.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6">
          <h2 className="text-lg font-semibold">Expected flow</h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-neutral-400">
            <li>1. Install the starter into the project.</li>
            <li>2. Customize tool metadata and the real routes/components.</li>
            <li>3. Regenerate derived docs or fixtures from the registry.</li>
            <li>4. Run verification commands.</li>
            <li>5. Open observability and confirm a real AI interaction.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
