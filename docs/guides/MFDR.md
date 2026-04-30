# MFDR Technical Decision Record

MFDR is the durable technical/spec record that explains the product hypothesis and the decisions behind APIs, tools, UI, setup, costs, risks, and verification.

Run it early:

```bash
pnpm mfdr
pnpm sync
pnpm score
```

It writes:

- `.ai-starter/mfdr/latest.md`
- `.ai-starter/mfdr/latest.json`
- `.ai-starter/manifests/mfdr.json`
- `.ai-starter/skills/mfdr/SKILL.md`

Use product validation to answer whether the product should be built. Use MFDR to answer how it should be built and proven.

MFDR is also an interview artifact. The user can answer it directly, or an agent can draft it from existing docs, code, installed providers, and current web/provider research. The important rule is that technical choices must name the alternatives considered and the validation path, especially when the decision involves paid APIs, model providers, image/render/browser services, storage, queues, auth, or long-running workflow infrastructure.

MFDR should cover:

- product hypothesis and MVP slice
- API/service choices, including custom paid APIs outside AI Gateway
- provider docs, env vars, failure modes, cost tracking, and contract tests
- tool and agent-runtime approach for Codex/Claude
- design contract, tokens, interaction model, and screenshot/Expect proof
- verification commands: `sync`, `typecheck`, `test`, `browser:proof`, `gates`, `score`, `report`
- risks, open questions, and next step

Each decision should answer:

- what was chosen
- why it fits this product and setup
- what credible alternatives were considered
- what would prove the decision wrong
- which command, contract test, browser proof, or usage record validates it

For strict workflows, another agent should read `.ai-starter/mfdr/latest.md` before broad implementation or integration work.

Useful source links:

- [ADR overview](https://adr.github.io/)
- [ADR templates and tradeoff guidance](https://adr.github.io/adr-templates/)
- [Vercel Workflow docs](https://vercel.com/docs/workflow) for future durable, resumable workflow decisions
