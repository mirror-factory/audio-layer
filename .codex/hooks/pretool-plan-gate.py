#!/usr/bin/env python3
"""PreToolUse hook for plan-before-build enforcement."""

from __future__ import annotations

import sys

from starter_hook_utils import (
    PLAN_FILE,
    STARTER_TRACKING_FILE,
    append_event,
    collect_paths,
    current_plan_id,
    extract_tool_input,
    extract_tool_name,
    read_payload,
)


WRITE_TOOLS = {"Write", "Edit", "MultiEdit", "apply_patch", "functions.apply_patch"}
TARGET_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".py"}
SKIP_PREFIXES = (
    ".ai-starter/",
    ".claude/",
    ".codex/",
    "docs/",
    "tests/",
    "evals/",
    ".github/",
)


def path_requires_plan(path: str) -> bool:
    if path.endswith(".md") or path.endswith(".json"):
        return False
    if path.startswith(SKIP_PREFIXES):
        return False
    if not path.endswith(tuple(TARGET_EXTENSIONS)):
        return False
    return path.startswith(("app/", "components/", "lib/", "src/", "pages/"))


def main() -> None:
    if not STARTER_TRACKING_FILE.exists():
        return

    payload = read_payload()
    tool_name = extract_tool_name(payload)
    if tool_name and tool_name not in WRITE_TOOLS:
        return

    paths = collect_paths(extract_tool_input(payload))
    relevant_paths = [path for path in paths if path_requires_plan(path)]
    if not relevant_paths:
        return

    if current_plan_id() and PLAN_FILE.exists():
        append_event(
            phase="PreToolUse",
            hook="pretool-plan-gate.py",
            outcome="allowed",
            classification="enforcer",
            blocks=True,
            matcher="Write|Edit|MultiEdit",
            gate="plan",
            tool=tool_name or "unknown",
            paths=relevant_paths,
            reason="active-plan-found",
        )
        return

    append_event(
        phase="PreToolUse",
        hook="pretool-plan-gate.py",
        outcome="blocked",
        classification="enforcer",
        blocks=True,
        matcher="Write|Edit|MultiEdit",
        gate="plan",
        tool=tool_name or "unknown",
        paths=relevant_paths,
        reason="no-active-plan",
    )
    sys.stderr.write(
        'Blocked implementation write because no active plan artifact exists. '
        'Run `pnpm plan -- "<task description>"` first.\n'
    )
    raise SystemExit(2)


if __name__ == "__main__":
    main()
