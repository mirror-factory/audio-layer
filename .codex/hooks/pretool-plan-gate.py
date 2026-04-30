#!/usr/bin/env python3
"""PreToolUse hook for plan-before-build enforcement."""

from __future__ import annotations

import sys

from starter_hook_utils import (
    PLAN_FILE,
    PRODUCT_VALIDATION_FILE,
    PRODUCT_VALIDATION_MANIFEST_FILE,
    SETUP_CONFIG_FILE,
    STARTER_TRACKING_FILE,
    append_event,
    collect_paths,
    current_plan_id,
    extract_tool_input,
    extract_tool_name,
    read_json,
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


def product_validation_required() -> bool:
    setup = read_json(SETUP_CONFIG_FILE, {}) or {}
    product_validation = setup.get("productValidation") if isinstance(setup, dict) else {}
    return isinstance(product_validation, dict) and product_validation.get("mode") == "required"


def product_validation_ready() -> bool:
    artifact = read_json(PRODUCT_VALIDATION_MANIFEST_FILE, None) or read_json(PRODUCT_VALIDATION_FILE, {}) or {}
    status = artifact.get("status") if isinstance(artifact, dict) else None
    return status in {"complete", "bypassed"}


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
        if product_validation_required() and not product_validation_ready():
            append_event(
                phase="PreToolUse",
                hook="pretool-plan-gate.py",
                outcome="blocked",
                classification="enforcer",
                blocks=True,
                matcher="Write|Edit|MultiEdit",
                gate="product-validation",
                tool=tool_name or "unknown",
                paths=relevant_paths,
                reason="product-validation-required",
            )
            sys.stderr.write(
                'Blocked implementation write because product validation is required but incomplete. '
                'Run `pnpm product:validate` or bypass with an explicit reason before broad product work.\n'
            )
            raise SystemExit(2)
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
