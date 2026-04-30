---
name: product-validation
description: Validate product ideas using YC-style questions, market-fit analysis, technical feasibility, pricing, GTM, MVP scope, risks, and repeatable evidence-based recommendations. Use when assessing a startup idea, product concept, new feature, market opportunity, paid tool bundle, SaaS concept, AI agent product, MCP/tooling product, or business model before building.
---

# Product Validation

Use this skill to turn a rough product idea into a clear validation memo and action plan. Prefer direct, practical judgment over generic startup advice. If current market facts, competitors, pricing, regulation, or platform behavior matter, verify them with current research before making claims.

## Starter Artifacts

- Write the durable memo to `.ai-starter/product-validation/latest.md`.
- Write/update machine state in `.ai-starter/product-validation/latest.json`.
- Keep `.ai-starter/manifests/product-validation.json` synced with the latest memo.
- If validation is bypassed, record the explicit reason in `.ai-starter/config.json` and the latest validation artifact.

## Inputs To Extract

Identify these from the prompt or interview. If missing, make conservative assumptions and label them:

- Customer: who has the pain most often and most urgently
- Problem: what painful job, workflow, cost, delay, or risk exists today
- Current workaround: what customers use now instead
- Proposed solution: what the product does
- Pricing: expected willingness to pay and likely packaging
- Distribution: where the first 100 users can come from
- Timing: why the opportunity exists now
- Constraints: technical, security, legal, operational, or support limits

Ask a clarifying question only when a missing answer would materially change the recommendation. Otherwise proceed with labeled assumptions.

## Validation Questions

Answer these in plain language:

- What problem does this solve?
- Who has the problem most painfully?
- How often does the problem happen?
- What are customers doing now?
- Why is the current workaround bad enough to switch?
- Why now?
- What is the smallest useful product?
- What would make someone pay?
- What would make someone churn?
- What could make the idea fail even if the product works?
- What is the strongest wedge?
- What is the expansion path?

## Market And Customer Fit

Segment customers by urgency, reachable distribution, and ability to pay. Prefer a narrow early segment over a broad audience.

Rate each segment:

- Pain intensity: low, medium, high
- Reachability: low, medium, high
- Budget: low, medium, high
- Frequency: one-time, occasional, recurring
- Best first offer: what they should buy first

Recommend one initial customer segment and explain why.

## Product Shape

Define the product in layers:

- Core promise: one sentence
- MVP: smallest version that proves willingness to pay
- Activation moment: first moment the user sees value
- Retention loop: why the user comes back
- Paid value: why payment is justified
- Trust requirement: what must be verified, secured, or supported

For AI, agent, automation, or tooling products, separate:

- Tools: deterministic actions
- Skills/workflows: reusable processes
- Recipes/templates: user-facing use cases
- Infrastructure: auth, billing, hosting, logging, versioning, support

## Pricing And Packaging

Recommend pricing based on buyer type and support burden. Include:

- Free or trial tier
- Entry paid tier
- Higher-value tier
- Team or agency tier if relevant
- What belongs outside the cheapest plan

Flag pricing that is too cheap for the expected support, security, or compute burden.

## Go-To-Market

Create a practical first distribution plan:

- First 100 users
- Channels to test
- Demo angle
- Landing page promise
- Outreach target
- Content/SEO opportunities
- Community launch options
- Conversion event to measure

Avoid vague advice like "post on social." Name the specific audience and the specific message.

## Technical Feasibility

Assess:

- Build complexity
- Third-party dependencies
- Data and API risks
- Security risks
- Reliability needs
- Maintenance burden
- Testing approach
- MVP architecture

For tool or agent products, require:

- Strict input schemas
- Structured output schemas
- Clear failure modes
- Versioning
- Example invocations
- Security notes
- Automated tests

## Decision Output

End with a concise recommendation:

- Build, test first, narrow, or avoid
- Best first customer
- MVP scope
- Pricing recommendation
- Main risk
- First validation experiment
- Success threshold

Use this structure for the final memo:

```markdown
## Verdict

## Best Customer

## Problem

## Product Shape

## MVP

## Pricing

## Go-To-Market

## Technical Plan

## Risks

## Validation Experiment

## Next Step
```

## Quality Bar

The output should be specific enough that the user can build a landing page, run outreach, or scope an MVP from it. Replace generic startup language with concrete customer, product, channel, pricing, and technical decisions.
