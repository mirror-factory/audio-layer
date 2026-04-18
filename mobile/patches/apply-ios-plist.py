#!/usr/bin/env python3
"""
Patch a Capacitor-generated iOS Info.plist with the keys audio-layer needs:
  - NSMicrophoneUsageDescription
  - UIBackgroundModes (audio) so mic capture survives backgrounding
  - NSAppTransportSecurity localhost exception for `pnpm dev` → simulator

Idempotent: re-running leaves existing keys alone. Uses Python's stdlib
plistlib so we don't drag a Ruby/Node dep in.

Usage:
  python3 mobile/patches/apply-ios-plist.py ios/App/App/Info.plist
"""

from __future__ import annotations

import plistlib
import sys
from pathlib import Path

KEYS = {
    "NSMicrophoneUsageDescription": (
        "audio-layer needs the microphone to transcribe what you say during "
        "recordings."
    ),
}


def upsert_background_audio(plist: dict) -> None:
    """Ensure UIBackgroundModes includes 'audio'."""
    modes = plist.get("UIBackgroundModes") or []
    if "audio" not in modes:
        modes.append("audio")
    plist["UIBackgroundModes"] = modes


def upsert_ats(plist: dict) -> None:
    """Allow http://localhost:3000 traffic in dev builds."""
    ats = plist.get("NSAppTransportSecurity") or {}
    exceptions = ats.get("NSExceptionDomains") or {}
    exceptions["localhost"] = {
        "NSExceptionAllowsInsecureHTTPLoads": True,
        "NSExceptionMinimumTLSVersion": "TLSv1.0",
        "NSIncludesSubdomains": True,
    }
    ats["NSExceptionDomains"] = exceptions
    plist["NSAppTransportSecurity"] = ats


def main(plist_path: Path) -> int:
    if not plist_path.exists():
        print(f"error: {plist_path} does not exist", file=sys.stderr)
        return 1

    with plist_path.open("rb") as f:
        plist = plistlib.load(f)

    changed = False
    for key, default_value in KEYS.items():
        if key not in plist:
            plist[key] = default_value
            changed = True
            print(f"  + {key}")
        else:
            print(f"  ~ {key} (kept existing value)")

    # These helpers idempotently add-or-preserve
    before = dict(plist)
    upsert_background_audio(plist)
    upsert_ats(plist)
    if plist != before:
        changed = True
        print("  + UIBackgroundModes[audio]")
        print("  + NSAppTransportSecurity localhost exception")

    if changed:
        with plist_path.open("wb") as f:
            plistlib.dump(plist, f)
        print(f"  -> wrote {plist_path}")
    else:
        print("  (no changes)")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: apply-ios-plist.py <path-to-Info.plist>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(Path(sys.argv[1])))
