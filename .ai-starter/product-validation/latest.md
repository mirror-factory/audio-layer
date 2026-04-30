# Product Validation Memo

Updated: 2026-04-30T17:13:36.031Z
Status: missing-inputs
Mode: recommended

## Verdict
test-first

## Best Customer
Unvalidated: define the narrow first customer before broad implementation.

## Problem
Unanswered.

## Product Shape
Core promise: AI product app managed by the AI Starter Kit.
Activation moment: the first user-visible workflow proves "the target job" can be completed.
Retention loop: Unanswered; define why this is recurring now.

## MVP
- One primary workflow that proves the painful job can be completed.
- One measurable activation moment and one retention reason.
- One priced offer or concierge/manual validation path before broad automation.
- Repo evidence: plan, tests, browser proof, docs, scorecard, and handoff report.

## Pricing
Unvalidated. Use a paid pilot or narrow entry tier before building high-support automation.

## Go-To-Market
- Identify one reachable first-100-user channel before implementation expansion.
- Write the landing-page promise from the customer/problem/current-workaround answers.
- Run 5-10 direct customer conversations before treating the scope as validated.

## Technical Plan
Build complexity: medium
Dependencies: Vercel AI Gateway

Testing approach:
- Unit/contract coverage for deterministic APIs and adapters.
- Playwright/Expect proof for user journeys.
- Rubric/eval coverage for AI/tool behavior.
- Cost events for AI Gateway and direct paid APIs.

## Risks
- The first customer/problem/workaround is not validated enough to justify broad build scope.
- Pricing is not validated; support and compute cost may exceed willingness to pay.
- Distribution is not validated; the first 100 users may be hard to reach.
- Technical scope is manageable if verification remains strict.

## Validation Experiment
Run a landing-page/demo or concierge workflow for the named customer segment before broad build-out.
Success threshold: At least 5 qualified conversations, 2 strong follow-ups, or 1 paid/LOI-style signal for the narrow MVP.

## Next Step
Run `pnpm product:validate` or mark the validation as bypassed with a reason before large product work.
