---
name: mfdr
description: Create or update the MFDR technical decision/spec record for product hypothesis, research basis, API/service choices, tool strategy, UI direction, setup decisions, risks, and verification. Use before major architecture, integration, AI tool/runtime, UI system, or MVP implementation choices.
---

# MFDR

Use the runtime-neutral starter skill at `.ai-starter/skills/mfdr/SKILL.md`.

Required durable outputs:

- `.ai-starter/mfdr/latest.md`
- `.ai-starter/mfdr/latest.json`
- `.ai-starter/manifests/mfdr.json`

Fast path:

```bash
pnpm mfdr
pnpm sync
pnpm score
```

Update the MFDR when the product hypothesis, API/service approach, tool strategy, UI direction, cost model, or verification strategy changes.
