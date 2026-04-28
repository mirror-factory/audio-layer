export default function AIStarterHubPage() {
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,hsl(190_70%_16%),transparent_30%),linear-gradient(180deg,hsl(224_22%_8%),hsl(224_18%_5%))] px-6 py-8 text-neutral-100">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="rounded-[28px] border border-cyan-500/20 bg-neutral-950/80 p-6 shadow-[0_24px_80px_rgba(6,182,212,0.12)]">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
            AI Starter Hub
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            The starter adds state, flow, enforcement, and visibility to the repo.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-300">
            Keep this page honest. It should tell a teammate or operator what
            exists today, what commands matter, and how to verify the system
            without reading the whole repository.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            {
              title: "State",
              copy:
                "The project now has machine-readable setup, manifests, plans, evidence, and reports in .ai-starter/.",
            },
            {
              title: "Flow",
              copy:
                "The intended path is init -> setup -> sync -> plan -> work -> verify -> score -> report.",
            },
            {
              title: "Hooks",
              copy:
                "Claude hooks can enforce plan and research expectations and record telemetry.",
            },
            {
              title: "Visibility",
              copy:
                "Use /control-plane actions, registries, cost ledgers, and /observability to inspect what happened.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5"
            >
              <h2 className="text-sm font-semibold text-neutral-100">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-400">
                {item.copy}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6">
          <h2 className="text-lg font-semibold text-neutral-100">
            Recommended workflow
          </h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-neutral-400">
            <li>1. Install the starter into the repo.</li>
            <li>2. Run <code>pnpm run starter:setup</code> to configure provider, env, integrations, modules, and design.</li>
            <li>3. Put real secrets in <code>.env.local</code>; keep <code>.env.example</code> safe.</li>
            <li>4. Run <code>pnpm sync</code> to generate starter manifests.</li>
            <li>
              5. Run <code>{'pnpm plan -- "..."'}</code> before meaningful feature
              work.
            </li>
            <li>6. Implement while Claude hooks keep the flow stricter.</li>
            <li>7. Run <code>pnpm score</code> and <code>pnpm report</code>.</li>
            <li>
              8. Run <code>pnpm design:check</code> when UI changes touch app or
              component files.
            </li>
            <li>
              9. Record external API spend with <code>trackedFetch()</code>,{" "}
              <code>recordApiUsage()</code>, or <code>pnpm usage:record</code>.
            </li>
            <li>
              8. Open <code>/control-plane</code> and <code>/observability</code>.
            </li>
          </ol>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6">
            <h2 className="text-lg font-semibold text-neutral-100">
              Where to look first
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-400">
              <li>
                <code>.ai-starter/manifests/starter.json</code> for the installed
                system contract
              </li>
              <li>
                <code>.ai-starter/plans/latest.json</code> for the current task
                contract
              </li>
              <li>
                <code>.ai-starter/runs/latest-scorecard.json</code> for current
                blockers
              </li>
              <li>
                <code>.ai-starter/reports/latest.md</code> for handoff summary
              </li>
              <li>
                <code>.ai-starter/runs/control-plane-actions.jsonl</code> for
                dashboard-triggered command history
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6">
            <h2 className="text-lg font-semibold text-neutral-100">
              What is still future work
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-400">
              <li>browser setup wizard for design/intake</li>
              <li>dashboard editing/writeback for DESIGN.md</li>
              <li>broad screenshot-driven autonomous iteration</li>
              <li>hosted multi-repo control plane</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
