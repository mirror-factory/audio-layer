# Code Signing & Notarization

Tracks: **PROD-380** (macOS Gatekeeper / DMG signing — urgent), **PROD-356** & **PROD-366** (Windows + cross-platform signing).

This document describes how the Layers Electron build pipeline produces signed and notarized macOS DMGs, and where Windows code signing will plug in once we have an Authenticode certificate.

---

## Status

- macOS: config wiring is in place. Until the GitHub secrets below are populated, `electron-mac` builds emit **unsigned DMGs** with a `::warning::` log. Unsigned DMGs trigger a Gatekeeper "Apple could not verify Layers.app is free of malware" prompt on first launch.
- Windows: placeholder only. We do not yet hold an EV/OV Authenticode certificate. See `electron-builder.yml` `win.signtoolOptions` comment.

Rollout sequence for macOS:
1. Merge config wiring (this PR).
2. Populate GitHub secrets (below).
3. Tag a release (`vX.Y.Z`) — the `electron-mac` job auto-detects `CSC_LINK`, decodes the `.p8` notarytool key, flips `notarize: true`, and produces a signed + notarized DMG.

---

## Required GitHub Secrets (macOS)

Set these on the repo via **Settings -> Secrets and variables -> Actions -> New repository secret**.

| Secret | What it is | Required? |
|---|---|---|
| `CSC_LINK` | Base64-encoded **Developer ID Application** `.p12` certificate (cert + private key bundle). | Required to enable signing. |
| `CSC_KEY_PASSWORD` | Password for the `.p12`. | Required when `CSC_LINK` is set. |
| `APPLE_API_KEY` | Base64-encoded App Store Connect API key (`.p8` file content). Preferred path. | Required for notarization (option 1). |
| `APPLE_API_KEY_ID` | The 10-character key ID shown next to the `.p8` in App Store Connect. | Required with `APPLE_API_KEY`. |
| `APPLE_API_ISSUER` | The Issuer ID UUID from App Store Connect (Users and Access -> Integrations -> App Store Connect API). | Required with `APPLE_API_KEY`. |
| `APPLE_TEAM_ID` | 10-character Apple Developer Team ID. | Required. |
| `APPLE_ID` | Apple ID email address. | Optional fallback (option 2 — only used when API key is absent). |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password generated at appleid.apple.com. | Required if using `APPLE_ID` fallback. |

**Recommendation:** use the App Store Connect API key (`APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER`). It's revocable per-key and doesn't depend on a personal Apple ID.

---

## Encoding the Cert and Notarytool Key

### `.p12` Developer ID Application certificate -> `CSC_LINK`

Export from Keychain Access ("Developer ID Application: Mirror Factory, Inc. (TEAMID)") as a `.p12` with a strong password. Then:

```bash
base64 -i DeveloperID.p12 -o DeveloperID.p12.base64
pbcopy < DeveloperID.p12.base64   # paste into the CSC_LINK GitHub secret
```

Set the password as `CSC_KEY_PASSWORD`.

### `.p8` notarytool API key -> `APPLE_API_KEY`

Download the key file (`AuthKey_XXXXXXXXXX.p8`) from App Store Connect. **You can only download it once** — store a copy in 1Password before encoding. Then:

```bash
base64 -i AuthKey_XXXXXXXXXX.p8 -o AuthKey.p8.base64
pbcopy < AuthKey.p8.base64        # paste into the APPLE_API_KEY GitHub secret
```

Set the key ID (the 10-character `XXXXXXXXXX` portion) as `APPLE_API_KEY_ID` and the App Store Connect Issuer ID as `APPLE_API_ISSUER`.

The CI job decodes the base64 back into a real `.p8` file at `${RUNNER_TEMP}/private_keys/AuthKey_${APPLE_API_KEY_ID}.p8` and points the `APPLE_API_KEY` env var at that path before running `electron-builder` — that's the path notarytool actually expects.

---

## How the workflow uses these

`.github/workflows/build-release.yml`:

1. Loads all secrets into the job env.
2. Detects whether `CSC_LINK` + `CSC_KEY_PASSWORD` are populated. If not, sets `signing_enabled=false`, logs a `::warning::`, and runs the **unsigned fallback** build (still uploads the DMG so internal/dev consumers aren't blocked).
3. If signing is enabled, decodes `APPLE_API_KEY` (base64) into a `.p8` file, points `APPLE_API_KEY` env var at that path, and rewrites `electron-builder.yml` to flip `notarize: true`, then runs `electron-builder`.
4. `electron-builder` consumes the signing env vars (CSC_LINK, CSC_KEY_PASSWORD) and notarytool env vars (APPLE_API_KEY/_ID/_ISSUER, APPLE_TEAM_ID) automatically — no flags required at the CLI.

References:
- https://www.electron.build/code-signing-mac.html
- https://www.electron.build/configuration/mac.html

---

## Verifying a Built DMG Locally

Download the artifact, mount the DMG, then run:

```bash
# 1) Confirm the .app is signed with a valid Developer ID Application cert.
codesign --verify --deep --strict --verbose=2 /Volumes/Layers/Layers.app

# 2) Confirm Gatekeeper accepts it (i.e. signed + notarized + stapled).
spctl --assess --type execute -v /Volumes/Layers/Layers.app
# Expected: "accepted" + "source=Notarized Developer ID"

# 3) Optional: confirm the notarization ticket is stapled.
xcrun stapler validate /Volumes/Layers/Layers.app
```

If `spctl` reports `source=Developer ID` (no "Notarized"), the cert is fine but notarization failed or the ticket wasn't stapled — check the notarytool log surfaced by `electron-builder` in CI.

---

## Windows (placeholder — PROD-356 / PROD-366)

We do not yet have an Authenticode certificate. The `win.signtoolOptions` block in `electron-builder.yml` is commented out as a placeholder. When acquired:

- Add `WINDOWS_CSC_LINK` (base64 of `.pfx`) and `WINDOWS_CSC_KEY_PASSWORD` secrets.
- Wire them into the `electron-windows` job env (mirror the macOS pattern).
- Uncomment `win.signtoolOptions` in `electron-builder.yml`.

EV (Extended Validation) certificates avoid SmartScreen reputation warnings on first install; OV (Organization Validation) certificates are cheaper but require time/install volume to build SmartScreen reputation.

---

## Troubleshooting

- **"Code signing skipped" warning in CI:** `CSC_LINK` is empty. Either populate it or accept the unsigned build for now.
- **`No identity found` even with CSC_LINK set:** Check that `CSC_KEY_PASSWORD` matches the `.p12` password and that the `.p12` actually contains a *Developer ID Application* cert (not Mac App Distribution / Mac Installer / etc.).
- **Notarization rejected with `Invalid` status:** Check the notarytool log for missing entitlements or unsigned nested binaries. Hardened runtime is on, so any embedded helper must also be signed.
- **`spctl` says "source=Developer ID" not "Notarized":** Notarization didn't complete or didn't staple. Re-run with debug logs.
