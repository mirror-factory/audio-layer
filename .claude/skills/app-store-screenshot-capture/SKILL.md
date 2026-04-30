---
name: app-store-screenshot-capture
description: Use when generating Layers App Store screenshots from the live app, especially polished iPhone/iPad captures with repeatable demo data.
---

# App Store Screenshot Capture

Use the committed device screenshot script when the user asks for App Store,
marketing, iPhone, iPad, or presentable product screenshots.

## Workflow

1. Confirm the dev server is reachable at `SCREENSHOT_BASE_URL` or
   `http://localhost:3001`.
2. Run:

   ```bash
   pnpm screenshots:devices
   ```

3. For authenticated captures, pass credentials only through environment
   variables:

   ```bash
   LAYER_SCREENSHOT_EMAIL="user@example.com" \
   LAYER_SCREENSHOT_PASSWORD="..." \
   pnpm screenshots:devices
   ```

4. Review the generated PNGs before handoff. The default folder is
   `docs/app-store/device-screenshots/<YYYY-MM-DD>/`.
5. Keep secrets out of committed files and final messages.

For the five App Store benefit/marketing screenshots, run:

```bash
node scripts/generate-app-store-screenshots.mjs
```

The default folder is
`docs/app-store/marketing-screenshots/<YYYY-MM-DD>/`.

## Notes

- The script captures the live app UI but mocks recent meetings, calendar
  events, and recording preflight responses so screenshots are stable.
- The marketing script renders `docs/design/app-store-screenshots.html`, so
  update that source when the product visual direction changes.
- Capture both light and dark mode unless the user asks for one theme.
- Prefer committed screenshot folders under `docs/app-store/`; keep temporary
  Playwright artifacts under `output/`.
