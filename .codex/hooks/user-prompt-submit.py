#!/usr/bin/env python3
"""Codex UserPromptSubmit hook for starter intake guidance."""

from __future__ import annotations

import json

from starter_hook_utils import (
    ALIGNMENT_FILE,
    ALIGNMENT_MANIFEST_FILE,
    PLAN_FILE,
    MFDR_FILE,
    MFDR_MANIFEST_FILE,
    PRODUCT_SPEC_FILE,
    PRODUCT_SPEC_MANIFEST_FILE,
    PRODUCT_VALIDATION_FILE,
    PRODUCT_VALIDATION_MANIFEST_FILE,
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
    alignment = read_json(ALIGNMENT_MANIFEST_FILE, None) or read_json(ALIGNMENT_FILE, {}) or {}
    product_spec = read_json(PRODUCT_SPEC_MANIFEST_FILE, None) or read_json(PRODUCT_SPEC_FILE, {}) or {}
    product_validation = read_json(PRODUCT_VALIDATION_MANIFEST_FILE, None) or read_json(PRODUCT_VALIDATION_FILE, {}) or {}
    mfdr = read_json(MFDR_MANIFEST_FILE, None) or read_json(MFDR_FILE, {}) or {}
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
        f"- Alignment: {alignment.get('status', 'missing')} ({alignment.get('summary', 'no summary')})",
        f"- Active plan: {plan.get('title') if has_active_plan else 'missing'}",
        f"- Product spec: {product_spec.get('status', 'missing')} ({product_spec.get('customer', 'no customer')} / {product_spec.get('painfulProblem', 'no problem')})",
        f"- Product validation: {product_validation.get('status', 'missing')} ({product_validation.get('mode', 'recommended')})",
        f"- MFDR: {mfdr.get('status', 'missing')} ({mfdr.get('title', 'no title')})",
        f"- Current task: {session.get('currentTask') or 'none'}",
        f"- Open tasks: {len(progress.get('openTasks') or [])}",
        f"- Score: {scorecard.get('score', 'not generated')}",
        "- Required starter commands: pnpm product:spec, pnpm product:validate, pnpm mfdr, pnpm plan, pnpm sync, pnpm browser:proof, pnpm score, pnpm gates, pnpm report",
    ]
    if alignment.get("openGaps"):
        context_lines.append(
            f"Alignment gaps: {'; '.join(str(item) for item in alignment.get('openGaps', [])[:3])}"
        )
    if looks_like_feature(prompt) and not has_active_plan:
        context_lines.append(
            'Feature-sized work needs a plan before implementation writes: run `pnpm plan -- "<task>"`.'
        )
    if looks_like_feature(prompt) and product_spec.get("status") == "draft":
        context_lines.append(
            "Large product/app work should keep the YC-style product spec current: run `pnpm product:spec` or explicitly bypass it."
        )
    if looks_like_feature(prompt) and product_validation.get("status") not in {"complete", "bypassed"}:
        context_lines.append(
            "Large product/app work should validate customer/problem/workaround/tech fit first: run `pnpm product:validate` or record an explicit bypass reason."
        )
    if looks_like_feature(prompt) and mfdr.get("status") != "complete":
        context_lines.append(
            "Large product/app work should record technical decisions first: run `pnpm mfdr` to capture API/tool/UI/setup/verification choices."
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
