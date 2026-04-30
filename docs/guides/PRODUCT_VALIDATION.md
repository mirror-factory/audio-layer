# Product Validation

The starter includes an early product/spec validation layer. Interactive `init` now launches setup, and setup asks the product validation questions before broad product work. Non-interactive installs still write default validation artifacts, then the agent should run `pnpm product:validate` before implementation scope expands.

## Command

```bash
pnpm product:validate
```

or from the package CLI:

```bash
pnpm exec ai-starter-kit validate-product
```

## Outputs

- `.ai-starter/product-validation/latest.md` — human-readable validation memo
- `.ai-starter/product-validation/latest.json` — machine-readable state
- `.ai-starter/manifests/product-validation.json` — dashboard/registry manifest
- `.ai-starter/skills/product-validation/SKILL.md` — reusable agent workflow

MFDR complements this layer. Product validation answers whether the product or feature is worth pursuing. MFDR answers how the API, tools, UI, setup, costs, and verification should work.

## Modes

- `recommended` warns/guides but does not block implementation.
- `required` blocks implementation writes until validation is complete or bypassed.
- `bypassed` allows work to continue but requires an explicit reason.

## What It Captures

- Customer
- Problem
- Current workaround
- Proposed solution
- Pricing
- Distribution
- Timing
- Technical/security/legal/support constraints

## Agent Behavior

`AGENTS.md` points Codex and Claude at the validation memo before large product work. The prompt hook adds reminder context when a request looks feature-sized. The PreToolUse hook only blocks when validation mode is `required`; otherwise the layer stays advisory.
