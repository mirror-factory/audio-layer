# app/page.tsx

## Purpose

Signed-out users see the public Layers marketing homepage. The page
positions the product as meeting memory without a meeting bot, shows the live
capture/transcript/tool handoff flow, demonstrates search and structured
outputs, and presents Free, Pro, and Team pricing CTAs. The public navigation
also links users to the cross-platform download page.

## Verification

- Playwright smoke: tests/e2e/app-page.smoke.spec.ts
- Expect flow: tests/expect/app-page.md
- Visual evidence: output/playwright/homepage-blended-desktop.png
- Mobile evidence: output/playwright/homepage-blended-mobile.png
