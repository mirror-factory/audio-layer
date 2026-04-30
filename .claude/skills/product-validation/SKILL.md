---
name: product-validation
description: Validate product ideas using YC-style questions, market-fit analysis, technical feasibility, pricing, GTM, MVP scope, risks, and repeatable evidence-based recommendations. Use before building a startup idea, product concept, large feature, AI agent product, MCP/tooling product, SaaS concept, or business model.
---

# Product Validation

Use the runtime-neutral starter skill at `.ai-starter/skills/product-validation/SKILL.md`.

Required durable outputs:

- `.ai-starter/product-validation/latest.md`
- `.ai-starter/product-validation/latest.json`
- `.ai-starter/manifests/product-validation.json`

Fast path:

```bash
pnpm product:validate
pnpm sync
pnpm score
```

If validation is bypassed, record the bypass reason in repo state before broad product work.
