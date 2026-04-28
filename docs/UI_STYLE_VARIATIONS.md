# UI Style Variations

Editable source:

- `docs/design/ui-style-variations.html`

Regenerate:

```bash
node scripts/generate-ui-style-variations.mjs
```

Exports:

- `output/design/ui-variations/noir-iphone.png`
- `output/design/ui-variations/noir-desktop.png`
- `output/design/ui-variations/paper-iphone.png`
- `output/design/ui-variations/paper-desktop.png`
- `output/design/ui-variations/native-iphone.png`
- `output/design/ui-variations/native-desktop.png`
- `output/design/ui-variations/workbench-iphone.png`
- `output/design/ui-variations/workbench-desktop.png`
- `output/design/ui-variations/contact-sheet.png`

## Directions

### 01 Noir Signal

Best match for the current brand. Dark, precise, fast, and recognizably Layer
One. Keeps the animated line as the emotional center and makes the app feel like
a premium capture tool.

### 02 Paper Calm

Best for client-facing warmth. Light, readable, less technical, and better for
longer review sessions. The risk is that it can become too soft if the product
loses the strong record-first action.

### 03 Native Sheet

Best for iOS polish. It pushes the mobile experience toward native sheets and
large focused controls. Strong for phone, weaker on desktop unless paired with a
denser library view.

### 04 Workbench

Best for power users and teams. More operational, command-oriented, and
integrations-ready. Strong for desktop, but likely too technical as the default
consumer-facing mobile experience.

## Recommendation

Use **Noir Signal** as the main product direction, borrow **Native Sheet** for
iPhone interaction patterns, and reserve **Workbench** for admin, MCP, provider,
and pricing surfaces. Keep **Paper Calm** as a light-mode alternative, not the
primary identity.
