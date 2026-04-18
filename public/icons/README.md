# App icons

Placeholders — replace with real artwork before App Store / Play Store
submission. The manifest.webmanifest + Next.js metadata reference:

- `icon-192.png` — 192×192 PNG, maskable-safe zone
- `icon-512.png` — 512×512 PNG, maskable-safe zone

Additional sizes Tauri and Capacitor will regenerate from a single
1024×1024 source:

```bash
# Tauri (macOS / Windows / Linux): generates iconset under src-tauri/icons/
cargo tauri icon path/to/source-1024.png

# Capacitor: run after `npx cap add ios|android`. Uses a separate
# community tool — there is no built-in command. Recommended:
#   npm i -D @capacitor/assets
#   npx @capacitor/assets generate \
#       --ios --android --pwa \
#       --icon-background "#0a0a0a"
```

Until a real logo exists, drop any 1024×1024 PNG here and re-run the
two commands above — the app won't render a meaningful icon otherwise
and the PWA install prompt will show a blank placeholder.
