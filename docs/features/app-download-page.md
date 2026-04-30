# app/download/page.tsx

## Purpose

Signed-out users can choose the right Layers surface for their device. The page
links to the web app login, the desktop release channel for macOS and Windows,
and the respective mobile store surfaces for iPhone/iPad and Android.

## Components

- `app/download/platform-recommendation.tsx` detects the visitor platform in
  the browser and promotes the matching desktop, mobile, or web action. The
  static cards remain visible for every platform so users can still choose a
  different install target.

## Verification

- Playwright smoke: tests/e2e/smoke.spec.ts
- Expect flow: tests/expect/app-download-page.md
- Visual evidence: output/playwright/download-page-desktop.png
- Mobile evidence: output/playwright/download-page-mobile.png
