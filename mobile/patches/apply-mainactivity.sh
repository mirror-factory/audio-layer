#!/usr/bin/env bash
#
# Patch the Capacitor-generated MainActivity so WebChromeClient grants
# getUserMedia permission requests from the WebView — without this,
# navigator.mediaDevices.getUserMedia() fails silently on Android
# because the WebView rejects PermissionRequest by default.
#
# Idempotent: reruns skip already-patched files.
#
#   bash mobile/patches/apply-mainactivity.sh android/app/src/main/java

set -euo pipefail

ROOT="${1:-android/app/src/main/java}"
if [ ! -d "$ROOT" ]; then
  echo "  (no java/ dir — skipping MainActivity patch)"
  exit 0
fi

patch_java() {
  local file="$1"
  echo "  + patching $file"
  python3 - "$file" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1])
src = p.read_text()
if "onPermissionRequest" in src:
    sys.exit(0)
for imp in [
    "import android.webkit.PermissionRequest;",
    "import android.webkit.WebChromeClient;",
]:
    if imp not in src:
        src = src.replace(
            "package ", imp + "\n\npackage ", 1
        ) if src.startswith("package ") else imp + "\n" + src
override = """

    @Override
    public void onStart() {
        super.onStart();
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    // Grant mic requests automatically — the Android OS still
                    // gates RECORD_AUDIO behind the runtime permission prompt.
                    request.grant(request.getResources());
                }
            });
        }
    }
"""
idx = src.rfind("}")
if idx != -1:
    src = src[:idx] + override + src[idx:]
p.write_text(src)
PY
}

patch_kotlin() {
  local file="$1"
  echo "  + patching $file"
  python3 - "$file" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1])
src = p.read_text()
if "onPermissionRequest" in src:
    sys.exit(0)
for imp in [
    "import android.webkit.PermissionRequest",
    "import android.webkit.WebChromeClient",
]:
    if imp not in src:
        src = imp + "\n" + src
override = """

    override fun onStart() {
        super.onStart()
        bridge?.webView?.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                // Grant mic requests automatically — Android's runtime
                // permission prompt still gates RECORD_AUDIO.
                request.grant(request.resources)
            }
        }
    }
}
"""
idx = src.rfind("}")
if idx != -1:
    src = src[:idx] + override
p.write_text(src)
PY
}

FOUND=0
while IFS= read -r file; do
  FOUND=1
  if grep -q "onPermissionRequest" "$file"; then
    echo "  ~ $file already patched"
    continue
  fi

  case "$file" in
    *.kt) patch_kotlin "$file" ;;
    *)    patch_java "$file" ;;
  esac
done < <(find "$ROOT" \( -name "MainActivity.java" -o -name "MainActivity.kt" \) 2>/dev/null)

if [ "$FOUND" = "0" ]; then
  echo "  (no MainActivity found — skipping)"
fi
