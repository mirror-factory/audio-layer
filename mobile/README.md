# mobile — Capacitor shell

Capacitor wraps the **live** hosted Next.js app (web URL via
`server.url` in `capacitor.config.ts`) into native iOS + Android
apps. No static export — the same backend that serves web and Tauri
serves mobile.

## Status

- `capacitor.config.ts` (repo root) — appId `com.mirrorfactory.audiolayer`,
  server.url per environment.
- `@capacitor/core`, `@capacitor/ios`, `@capacitor/android` deps, plus
  `@capacitor/cli` as a dev dep.
- `mobile/setup.sh` — idempotent bootstrap for a macOS workstation.
- `mobile/patches/` — Python + bash scripts that safely inject the
  mic permissions and WebView overrides after `npx cap add`.

The native `ios/` and `android/` project folders are NOT committed —
they're regenerated per-workstation via `npx cap add`. This keeps the
repo slim and avoids leaking per-machine Xcode / Gradle config.

## First-time setup (on your Mac)

```bash
# Prerequisites:
#   Xcode 15+ (for iOS)                     — from App Store
#   cocoapods                               — sudo gem install cocoapods
#   Android Studio + JDK 17                 — for Android
#   ANDROID_HOME or ANDROID_SDK_ROOT set    — .zshrc: export ANDROID_HOME=$HOME/Library/Android/sdk

cd /path/to/audio-layer
bash mobile/setup.sh
```

`setup.sh` runs:

1. `pnpm install`
2. `npx cap add ios` (if Xcode is installed) → creates `ios/`
3. Applies `apply-ios-plist.py` → `ios/App/App/Info.plist`
   - adds `NSMicrophoneUsageDescription`
   - adds `UIBackgroundModes` (`audio`) so mic capture survives
     backgrounding
   - adds an `NSAppTransportSecurity` exception for `localhost` so
     the Simulator can load `http://localhost:3000`
4. `npx cap sync ios`
5. `npx cap add android` (if ANDROID_HOME is set) → creates `android/`
6. Applies `apply-android-manifest.py` → `AndroidManifest.xml`
   - adds `RECORD_AUDIO` + `MODIFY_AUDIO_SETTINGS` permissions
   - sets `android:usesCleartextTraffic="true"` +
     `android:hardwareAccelerated="true"` on `<application>`
7. Applies `apply-mainactivity.sh` → overrides `onPermissionRequest`
   on the `WebChromeClient` so `getUserMedia()` from the WebView
   succeeds. Without this, `navigator.mediaDevices.getUserMedia()`
   fails silently on Android.
8. `npx cap sync android`

All four patchers are idempotent — re-running `setup.sh` after a
`pnpm install` or code change is safe and only re-patches missing
entries.

## Develop

```bash
# Terminal 1 — run the Next.js dev server
pnpm dev

# Terminal 2 — open iOS Simulator or device
npx cap open ios

# Or Android:
npx cap open android
```

The WebView loads `http://localhost:3000` in dev and
`https://audio-layer.vercel.app` in production (toggle via
`CAPACITOR_SERVER_URL` env var). Every route — `/record`,
`/record/live`, `/meetings`, `/sign-in`, `/pricing`, `/usage` — works
as it does in the browser.

## Native audio

Mobile mic capture inside the WebView uses `getUserMedia` +
AudioWorklet — the same path the regular browser uses. The permission
patches above make the native side grant the request.

System-audio capture from other apps is structurally limited:

- **iOS**: not possible from a normal app sandbox. ReplayKit can
  capture screen + audio with user consent, but it's heavyweight and
  only triggers from a UI button the user taps. Granola's iPhone app
  deliberately targets in-person meetings only — same trade-off
  applies here.
- **Android**: `MediaProjection` API (Android 10+) can capture audio
  from other apps when the user explicitly grants screen-capture
  consent. Behavior varies by device — treat as best-effort and test
  on a couple of models before shipping.

When we wire these, the pattern mirrors the Tauri Rust bridge: a
native plugin captures audio, decimates to 16 kHz int16 LE, posts
chunks to JS, and `LiveRecorder` feeds them into `StreamingTranscriber`
alongside (or instead of) the WebView mic.

## Troubleshooting

- **Xcode: "Signing requires a development team"** — open `ios/App.xcworkspace`, select the App target, Signing & Capabilities → pick your Apple ID.
- **Android build fails with "SDK location not found"** — ensure `ANDROID_HOME` is exported in your shell and `android/local.properties` points at it.
- **Mic prompt appears but `getUserMedia` still rejects** — on Android, double-check `MainActivity.java` has the `onPermissionRequest` override (rerun `apply-mainactivity.sh`); on iOS, verify `NSMicrophoneUsageDescription` is in `Info.plist`.
- **WebView shows a blank screen** — most likely `pnpm dev` isn't running or the simulator lost localhost. Set `CAPACITOR_SERVER_URL=https://<your-preview>.vercel.app` to load a deployed build instead.
