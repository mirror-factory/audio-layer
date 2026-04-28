#!/usr/bin/env python3
"""PreToolUse hook for dependency and research enforcement."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone

from starter_hook_utils import RESEARCH_INDEX_FILE, append_event, extract_command, read_payload


STALE_AFTER_DAYS = 7
INSTALL_HINTS = (
    "pnpm add",
    "pnpm install",
    "npm install",
    "yarn add",
    "yarn install",
    "bun add",
)
ALLOW_HINTS = ("research:bootstrap", "research:refresh", "pnpm sync", "ai-starter-kit sync")


def research_is_stale() -> tuple[bool, str]:
    if not RESEARCH_INDEX_FILE.exists():
        return True, "research cache is missing"

    try:
        index = json.loads(RESEARCH_INDEX_FILE.read_text())
    except Exception:
        return True, "research cache is unreadable"

    entries = index.get("entries", [])
    if not entries:
        return True, "research cache has no entries"

    cutoff = datetime.now(timezone.utc) - timedelta(days=STALE_AFTER_DAYS)
    stale_ids = []
    for entry in entries:
        last_fetched = entry.get("lastFetched")
        valid_until = entry.get("validUntil")
        candidate = last_fetched or valid_until
        if not candidate:
            stale_ids.append(entry.get("id") or entry.get("library") or "unknown")
            continue
        try:
            when = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
        except ValueError:
            stale_ids.append(entry.get("id") or entry.get("library") or "unknown")
            continue
        if when < cutoff:
            stale_ids.append(entry.get("id") or entry.get("library") or "unknown")

    if stale_ids:
        return True, f"stale entries: {', '.join(stale_ids[:5])}"
    return False, ""


def main() -> None:
    payload = read_payload()
    command = extract_command(payload).lower()
    if not command:
        return

    if any(hint in command for hint in ALLOW_HINTS):
        return

    if not any(hint in command for hint in INSTALL_HINTS):
        return

    stale, reason = research_is_stale()
    if stale:
        append_event(
            phase="PreToolUse",
            hook="pretool-install-research.py",
            outcome="blocked",
            classification="enforcer",
            blocks=True,
            matcher="Bash",
            gate="research",
            tool="Bash",
            command=command,
            reason=reason,
        )
        sys.stderr.write(
            "Blocked dependency change because starter research is not current "
            f"({reason}). Run `pnpm research:refresh` and `pnpm sync` first.\n"
        )
        raise SystemExit(2)

    append_event(
        phase="PreToolUse",
        hook="pretool-install-research.py",
        outcome="allowed",
        classification="enforcer",
        blocks=True,
        matcher="Bash",
        gate="research",
        tool="Bash",
        command=command,
        reason="research-fresh",
    )


if __name__ == "__main__":
    main()
