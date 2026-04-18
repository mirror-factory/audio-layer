#!/usr/bin/env bash
#
# First-time Capacitor bootstrap for macOS workstations with Xcode
# + Android SDK installed. Idempotent-ish: skips steps whose output
# already exists, so re-running is safe.
#
#   cd /path/to/audio-layer
#   bash mobile/setup.sh
#
# After this finishes:
#   npx cap open ios      # opens Xcode
#   npx cap open android  # opens Android Studio
#
# The iOS Info.plist and Android manifest get patched via the files
# in mobile/patches/ so mic permissions + WebView media flags work
# without editing XML by hand.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BOLD='\033[1m'; GREEN='\033[32m'; YELLOW='\033[33m'; RED='\033[31m'; NC='\033[0m'

echo -e "${BOLD}  audio-layer — Capacitor setup${NC}\n"

# ── Preflight ─────────────────────────────────────────────────────────
if ! command -v pnpm >/dev/null; then
  echo -e "${RED}pnpm is required.${NC} Install it: npm i -g pnpm"
  exit 1
fi

# Check for Xcode (for iOS) — warn but don't abort, since the user
# may only be doing Android.
if ! command -v xcodebuild >/dev/null; then
  echo -e "${YELLOW}!${NC} Xcode not detected. Skipping iOS steps (install Xcode + cocoapods to add iOS later)."
  HAS_XCODE=0
else
  HAS_XCODE=1
fi

# Check for a Java/Android toolchain — same warn-not-abort policy.
if [ -z "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ] && ! command -v sdkmanager >/dev/null; then
  echo -e "${YELLOW}!${NC} ANDROID_HOME / ANDROID_SDK_ROOT not set. Skipping Android steps (install Android Studio + JDK to add Android later)."
  HAS_ANDROID=0
else
  HAS_ANDROID=1
fi

# ── Build the web bundle so Capacitor has something to wrap ──────────
echo -e "${BOLD}Step 1.${NC} pnpm install"
pnpm install --silent

# ── iOS ──────────────────────────────────────────────────────────────
if [ "$HAS_XCODE" = "1" ]; then
  if [ ! -d "ios" ]; then
    echo -e "${BOLD}Step 2a.${NC} Adding iOS platform"
    pnpm exec cap add ios
  else
    echo -e "${BOLD}Step 2a.${NC} iOS already present — skipping cap add"
  fi

  echo -e "${BOLD}Step 2b.${NC} Patching ios/App/App/Info.plist"
  python3 mobile/patches/apply-ios-plist.py ios/App/App/Info.plist

  echo -e "${BOLD}Step 2c.${NC} pnpm exec cap sync ios"
  pnpm exec cap sync ios
fi

# ── Android ──────────────────────────────────────────────────────────
if [ "$HAS_ANDROID" = "1" ]; then
  if [ ! -d "android" ]; then
    echo -e "${BOLD}Step 3a.${NC} Adding Android platform"
    pnpm exec cap add android
  else
    echo -e "${BOLD}Step 3a.${NC} Android already present — skipping cap add"
  fi

  echo -e "${BOLD}Step 3b.${NC} Patching android/app/src/main/AndroidManifest.xml"
  python3 mobile/patches/apply-android-manifest.py android/app/src/main/AndroidManifest.xml

  echo -e "${BOLD}Step 3c.${NC} Patching android/app/src/main/java/.../MainActivity.*"
  bash mobile/patches/apply-mainactivity.sh android/app/src/main/java

  echo -e "${BOLD}Step 3d.${NC} pnpm exec cap sync android"
  pnpm exec cap sync android
fi

echo -e "\n${GREEN}Done.${NC} Next:"
[ "$HAS_XCODE" = "1" ]   && echo -e "  ${BOLD}npx cap open ios${NC}       # then run on a simulator or device"
[ "$HAS_ANDROID" = "1" ] && echo -e "  ${BOLD}npx cap open android${NC}   # then run on an emulator or device"
echo
echo -e "In dev, start ${BOLD}pnpm dev${NC} first — Capacitor loads"
echo -e "http://localhost:3000 into the native WebView via"
echo -e "capacitor.config.ts's server.url setting."
