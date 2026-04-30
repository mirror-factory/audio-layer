# App Store Screenshot Set

This set is an editable App Store concept deck for Layers. It uses static
HTML/CSS so the screenshots can be regenerated without a design tool.

Source:

- `docs/design/app-store-screenshots.html`

Exports:

- `output/app-store/01-fast-record.png`
- `output/app-store/02-bot-free.png`
- `output/app-store/03-structured-intake.png`
- `output/app-store/04-ask-library.png`
- `output/app-store/05-cost-control.png`

Messaging:

- Fast capture: open the app and start recording quickly.
- Private capture: no visible meeting bot joins the call.
- Intake over summaries: decisions, owners, risks, budget, and next steps.
- Askable library: search and chat across meeting history.
- Cost control: provider switching, usage limits, and pricing margin visibility.

Regenerate:

```bash
node scripts/generate-app-store-screenshots.mjs
```

## Live Device Captures

The polished iPhone/iPad screenshots are generated from the running app with
stable demo data for recent recordings, calendar context, and recording
readiness.

Default output:

- `docs/app-store/device-screenshots/<YYYY-MM-DD>/iphone-15-pro-max-home-light.png`
- `docs/app-store/device-screenshots/<YYYY-MM-DD>/iphone-15-pro-max-home-dark.png`
- `docs/app-store/device-screenshots/<YYYY-MM-DD>/ipad-pro-12-9-home-light.png`
- `docs/app-store/device-screenshots/<YYYY-MM-DD>/ipad-pro-12-9-home-dark.png`
- `docs/app-store/device-screenshots/<YYYY-MM-DD>/metadata.json`

Generate against the local app:

```bash
pnpm screenshots:devices
```

Generate while signed in:

```bash
LAYER_SCREENSHOT_EMAIL="user@example.com" \
LAYER_SCREENSHOT_PASSWORD="..." \
pnpm screenshots:devices
```

The script uses the live UI but mocks `/api/meetings`,
`/api/calendar/upcoming`, and `/api/transcribe/stream/preflight` so screenshots
stay presentable and repeatable. Do not commit credentials; only the generated
PNG/metadata artifacts belong in the screenshot folder.
