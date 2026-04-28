#!/usr/bin/env python3
"""Codex UserPromptSubmit hook for starter intake guidance."""

from __future__ import annotations

import json

from starter_hook_utils import (
    PLAN_FILE,
    PROGRESS_FILE,
    SCORECARD_FILE,
    SESSION_FILE,
    append_event,
    read_json,
    read_payload,
)


FEATURE_HINTS = (
    "add ",
    "build ",
    "implement ",
    "create ",
    "new api",
    "new page",
    "new component",
    "integrate ",
    "design ",
)


def looks_like_feature(prompt: str) -> bool:
    lower = prompt.lower()
    return any(hint in lower for hint in FEATURE_HINTS)


def main() -> None:
    payload = read_payload()
    prompt = str(payload.get("prompt") or payload.get("message") or "")
    plan = read_json(PLAN_FILE, {}) or {}
    session = read_json(SESSION_FILE, {}) or {}
    progress = read_json(PROGRESS_FILE, {}) or {}
    scorecard = read_json(SCORECARD_FILE, {}) or {}
    has_active_plan = bool(plan.get("id") and plan.get("status") != "done")

    append_event(
        phase="UserPromptSubmit",
        hook="user-prompt-submit.py",
        outcome="observed",
        classification="observer",
        blocks=False,
        matcher=None,
        gate="intake",
        reason="prompt-classified",
        details={
            "looksLikeFeature": looks_like_feature(prompt),
            "hasActivePlan": has_active_plan,
        },
    )

    context_lines = [
        "AI Starter context:",
        f"- Active plan: {plan.get('title') if has_active_plan else 'missing'}",
        f"- Current task: {session.get('currentTask') or 'none'}",
        f"- Open tasks: {len(progress.get('openTasks') or [])}",
        f"- Score: {scorecard.get('score', 'not generated')}",
        "- Required starter commands: pnpm plan, pnpm sync, pnpm score, pnpm gates, pnpm report",
    ]
    if looks_like_feature(prompt) and not has_active_plan:
        context_lines.append(
            'Feature-sized work needs a plan before implementation writes: run `pnpm plan -- "<task>"`.'
        )
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "UserPromptSubmit",
                    "additionalContext": "\n".join(context_lines),
                }
            }
        )
    )


if __name__ == "__main__":
    main()
