#!/usr/bin/env python3
"""
Patch a Capacitor-generated Android manifest with:
  - RECORD_AUDIO + MODIFY_AUDIO_SETTINGS permissions
  - android:usesCleartextTraffic="true" on <application> for localhost dev
  - android:hardwareAccelerated="true" (default, but enforce explicitly)

Idempotent. Uses xml.etree.ElementTree so we don't need a third-party
dep. Android doesn't care about XML comments being preserved, so we
round-trip conservatively.

Usage:
  python3 mobile/patches/apply-android-manifest.py \
      android/app/src/main/AndroidManifest.xml
"""

from __future__ import annotations

import sys
from pathlib import Path
from xml.etree import ElementTree as ET

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", ANDROID_NS)

PERMISSIONS = [
    "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS",
]


def has_permission(root: ET.Element, perm: str) -> bool:
    for el in root.findall("uses-permission"):
        name = el.get(f"{{{ANDROID_NS}}}name")
        if name == perm:
            return True
    return False


def add_permission(root: ET.Element, perm: str) -> None:
    el = ET.SubElement(root, "uses-permission")
    el.set(f"{{{ANDROID_NS}}}name", perm)
    # Insert at the top of children for readability. Not required by
    # the build system, but lines up with the Capacitor default shape.
    root.remove(el)
    root.insert(0, el)


def ensure_app_attrs(root: ET.Element) -> bool:
    """Ensure the <application> tag has cleartext + hardware-accelerated."""
    app = root.find("application")
    if app is None:
        return False
    changed = False
    desired = {
        f"{{{ANDROID_NS}}}usesCleartextTraffic": "true",
        f"{{{ANDROID_NS}}}hardwareAccelerated": "true",
    }
    for attr, val in desired.items():
        if app.get(attr) != val:
            app.set(attr, val)
            changed = True
    return changed


def main(manifest_path: Path) -> int:
    if not manifest_path.exists():
        print(f"error: {manifest_path} does not exist", file=sys.stderr)
        return 1

    tree = ET.parse(manifest_path)
    root = tree.getroot()
    changed = False

    for perm in PERMISSIONS:
        if not has_permission(root, perm):
            add_permission(root, perm)
            print(f"  + uses-permission {perm}")
            changed = True
        else:
            print(f"  ~ uses-permission {perm} (kept)")

    if ensure_app_attrs(root):
        print("  + <application usesCleartextTraffic=true hardwareAccelerated=true>")
        changed = True

    if changed:
        tree.write(manifest_path, encoding="utf-8", xml_declaration=True)
        print(f"  -> wrote {manifest_path}")
    else:
        print("  (no changes)")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: apply-android-manifest.py <path-to-AndroidManifest.xml>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(Path(sys.argv[1])))
