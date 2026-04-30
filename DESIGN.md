---
version: 1
name: "Project Design Contract"
status: active
updated: "2026-04-26"
owners:
  - "Project team"
audience:
  - "product team"
  - "engineers"
  - "Claude Code agents"
tokens:
  colors:
    ink: "oklch(0.97 0.004 260)"
    paper: "oklch(0.08 0.006 260)"
    panel: "oklch(0.12 0.006 260)"
    panelRaised: "oklch(0.16 0.006 260)"
    line: "oklch(0.82 0.006 260 / 0.28)"
    muted: "oklch(0.72 0.006 260)"
    success: "oklch(0.86 0.02 145)"
    warning: "oklch(0.84 0.03 88)"
    danger: "oklch(0.78 0.04 25)"
  spacing:
    pixel: "4px"
    compact: "8px"
    field: "12px"
    panel: "16px"
    section: "32px"
    stage: "64px"
  radii:
    none: "0"
    chip: "2px"
    panel: "4px"
  motion:
    tick: "120ms steps(4, end)"
    scan: "420ms steps(8, end)"
    reveal: "680ms steps(10, end)"
---

# Design Contract

This file is the repo source for design intent. It is meant for humans and agents.

It follows the same idea as Google's `design.md` proposal: structured front matter for machines, Markdown rationale for humans, and a stable file agents can read before UI work.

The runtime design registry lives at `.ai-starter/manifests/design.json`. The control plane reads that registry. This file explains the why behind the tokens and gives agents rules before they change UI.

## Product Feel

Describe the project's intended feel here.

Starter default:

- Strict, mechanical, and trustworthy.
- Black-and-white first, with muted status tones only when state needs them.
- Pixel-grid surfaces, square corners, terminal rhythm, and visible evidence.
- Fast motion that feels like scanlines, counters, and instrument panels.

## Design Inputs

Design state should be captured in repo files:

- `DESIGN.md`: intent, tone, token names, and agent-facing rules.
- `.ai-starter/manifests/design.json`: machine-readable design registry.
- `lib/project.config.ts`: project preferences and enabled integrations.
- `components/*.stories.tsx`: component-level design examples.
- `tests/e2e/*.visual.test.ts`: visual proof.
- `tests/expect/*.md`: natural-language browser checks.

## Design Flow

1. Capture or update design intent in this file.
2. Run `pnpm sync` to refresh manifests.
3. Build components from semantic tokens.
4. Add or update Storybook stories.
5. Add or update visual tests and Expect flows.
6. Run `pnpm test:e2e`, `pnpm browser:proof`, `pnpm gates`, and `pnpm score`.
7. Inspect `/control-plane`.

## Agent Rules

Before changing UI, read:

- `DESIGN.md`
- `.ai-starter/manifests/design.json`
- relevant component stories
- relevant visual tests
- latest screenshot or browser-proof evidence

Do not claim visual quality without screenshot or browser evidence.

## Current Limitations

Dashboard editing, image/URL design intake, automatic token extraction, and design drift enforcement are roadmap items. The reliable current path is repo-file first.

<!-- AI_STARTER_SETUP_DESIGN_START -->

## Starter Setup Design Contract

- Brand summary: Project-specific design system defined during setup; preserve existing product visual language when present.
- Visual style: project-specific
- Interaction style: Clear task-first flows with visible feedback and recoverable states.
- Density: medium
- Motion level: subtle
- Brand colors: not specified
- Reference systems: not specified
- Accessibility: WCAG AA contrast, keyboard reachability, visible focus, and reduced-motion support.
- Design input source: defaults
- Drift policy: warn
- Expect browser proof required: yes

Design changes should update this contract, `.ai-starter/config.json`, and `.ai-starter/manifests/design.json` together.

<!-- AI_STARTER_SETUP_DESIGN_END -->
