# YC-Style Product Spec

The product spec is the durable product-alignment artifact. It captures who the product is for, what painful problem already exists, what workaround proves demand, why now, the first wedge, MVP scope, pricing/distribution assumptions, research basis, validation plan, non-goals, and open questions.

Run it during install/setup, rerun it when product direction changes, or explicitly bypass it with a reason:

```bash
pnpm product:spec
pnpm product:spec --agent-fill
pnpm product:spec --bypass --bypass-reason "Prototype only; product risk accepted for this session."
```

It writes:

- `.ai-starter/product-spec/latest.md`
- `.ai-starter/product-spec/latest.json`
- `.ai-starter/manifests/product-spec.json`
- `.ai-dev-kit/spec.md` when that file is missing or starter-managed
- `.ai-starter/alignment/latest.md`

Use this artifact to answer whether the product direction is coherent. Use product validation to decide whether the product should be built. Use MFDR to decide how the architecture, APIs, tools, UI, costs, and verification should work.

## Install interview model

The starter treats this as an interview, not just a blank template. In an interactive install, the user can answer the product questions directly. In an agent shell, `--agent-fill` lets the agent draft from existing setup, docs, code, and research. In either path, the artifact should be explicit about unknowns instead of pretending the strategy is settled.

The minimum durable answers are:

- who the narrow customer is
- what painful problem they already have
- how they solve it today
- what insight makes this product plausible
- what first wedge is small enough to build and prove
- which metrics define a useful first version
- which assumptions still need customer, market, or technical research

If the project is a throwaway prototype, bypass is acceptable, but the bypass reason must be written so future agents know product risk was intentionally accepted.

## Agent alignment

`AGENTS.md`, `CLAUDE.md` when present, Codex hooks, Claude hooks, and `.ai-starter/alignment/latest.md` should all point back to this spec. The spec is not meant to be pasted into every prompt; it is meant to be a stable anchor that the hooks can reintroduce every few turns and that agents can open when they need detail.

The starter keeps the product spec lightweight enough for agents to read repeatedly, but complete enough to prevent drift during long sessions. AGENTS.md and runtime hooks point back to it through the alignment file.

Research basis:

- YC-style product thinking: launch quickly, talk to customers, solve a real painful problem, and avoid scaling before product-market fit.
- Local project evidence: docs registry, product validation memo, MFDR, DESIGN.md, scorecard, browser proof, and evidence manifests.
- Market/provider research: add current source links to the spec or research cache when the product depends on fast-moving APIs, competitors, pricing, or regulations.

Useful source links:

- [YC: From Student Side Project to Startup](https://www.ycombinator.com/blog/from-student-side-project-to-startup)
- [YC Startup School recap on user interviews and product-market fit](https://www.ycombinator.com/blog/startup-school-week-1-recap-kevin-hale-and-eric-migicovsky/)
