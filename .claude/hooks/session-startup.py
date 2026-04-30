#!/usr/bin/env python3
"""SessionStart hook -- inject starter system state at conversation start."""

from __future__ import annotations

import json
import subprocess

from starter_hook_utils import (
    ALIGNMENT_MANIFEST_FILE,
    GATES_FILE,
    MFDR_MANIFEST_FILE,
    PLAN_FILE,
    PRODUCT_SPEC_MANIFEST_FILE,
    PROGRESS_FILE,
    REPO_ROOT,
    RESEARCH_INDEX_FILE,
    SCORECARD_FILE,
    SESSION_FILE,
    append_event,
    current_plan_id,
    now_iso,
    read_json,
    write_json,
)


def run(cmd: list[str]) -> str:
    try:
        return subprocess.check_output(
            cmd, text=True, stderr=subprocess.DEVNULL, cwd=REPO_ROOT
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""


def main() -> None:
    branch = run(["git", "branch", "--show-current"]) or "(detached)"
    status = run(["git", "status", "--short"])
    recent_commits = run(["git", "log", "--oneline", "-3"])
    status_count = len(status.splitlines()) if status else 0

    session = read_json(
        SESSION_FILE,
        {
            "currentPlanId": None,
            "currentTask": "No active task yet",
            "lastDecision": None,
            "openGaps": [],
            "modifiedFiles": [],
            "updatedAt": now_iso(),
        },
    ) or {}
    progress = read_json(
        PROGRESS_FILE,
        {
            "currentPlanId": None,
            "openTasks": [],
            "closedTasks": [],
            "filesInFlight": [],
            "evidenceStatus": [],
            "updatedAt": now_iso(),
        },
    ) or {}
    plan = read_json(PLAN_FILE, {}) or {}
    scorecard = read_json(SCORECARD_FILE, None)
    product_spec = read_json(PRODUCT_SPEC_MANIFEST_FILE, {}) or {}
    mfdr = read_json(MFDR_MANIFEST_FILE, {}) or {}
    alignment = read_json(ALIGNMENT_MANIFEST_FILE, {}) or {}

    active_plan_id = current_plan_id()
    current_task = session.get("currentTask") or "(no active task)"
    if current_task in {"No active task yet", "(no active task)"}:
        current_task = plan.get("title") or current_task

    open_tasks = progress.get("openTasks", [])[:3]
    blockers = scorecard.get("blockers", [])[:3] if isinstance(scorecard, dict) else []
    open_gaps = session.get("openGaps", [])[:3]
    if not open_gaps or open_gaps == ["Run `pnpm sync` to generate starter manifests."]:
        open_gaps = blockers or open_tasks

    session_changed = False
    if active_plan_id and session.get("currentPlanId") != active_plan_id:
        session["currentPlanId"] = active_plan_id
        session_changed = True
    if current_task != session.get("currentTask"):
        session["currentTask"] = current_task
        session_changed = True
    if open_gaps != session.get("openGaps", [])[:3]:
        session["openGaps"] = open_gaps
        session_changed = True
    if session_changed:
        session["updatedAt"] = now_iso()
        write_json(SESSION_FILE, session)

    plan_summary = "(no active plan)"
    if active_plan_id:
        plan_summary = (
            f"{plan.get('classification', 'task')}: "
            f"{plan.get('title', '(untitled)')}"
        )

    score_summary = "(no scorecard yet)"
    if isinstance(scorecard, dict):
        score_summary = f"score {scorecard.get('score', '?')}/100 | blockers {len(scorecard.get('blockers', []))}"

    gate_status = "(not yet run)"
    if GATES_FILE.exists():
        data = read_json(GATES_FILE, {}) or {}
        required = data.get("required", {})
        recommended = data.get("recommended", {})
        gate_status = (
            f"required {required.get('passed', '?')}/{required.get('total', '?')}, "
            f"recommended {recommended.get('passed', '?')}/{recommended.get('total', '?')}"
        )

    research_status = None
    if RESEARCH_INDEX_FILE.exists():
        try:
            idx = json.loads(RESEARCH_INDEX_FILE.read_text())
            entries = idx.get("entries", [])
            from datetime import datetime, timezone

            now = datetime.now(timezone.utc)
            stale = []
            for entry in entries:
                valid_until = entry.get("validUntil")
                if not valid_until:
                    continue
                try:
                    valid_until_at = datetime.fromisoformat(valid_until.replace("Z", "+00:00"))
                    if valid_until_at < now:
                        stale.append(entry.get("id", "?"))
                except ValueError:
                    pass
            research_status = f"STALE: {', '.join(stale)}" if stale else f"all {len(entries)} fresh"
        except (json.JSONDecodeError, KeyError):
            pass

    append_event(
        phase="SessionStart",
        hook="session-startup.py",
        outcome="observed",
        classification="observer",
        blocks=False,
        reason="session-started",
        details={
            "branch": branch,
            "statusCount": status_count,
            "planSummary": plan_summary,
            "scoreSummary": score_summary,
            "gateStatus": gate_status,
        },
    )

    lines = ["<session-context>"]
    lines.append(f"Branch: {branch}")
    lines.append(f"Gate status: {gate_status}")
    lines.append(f"Plan: {plan_summary}")
    lines.append(f"Scorecard: {score_summary}")
    if research_status:
        lines.append(f"Research: {research_status}")
    if alignment:
        lines.append(
            f"Alignment: {alignment.get('status', 'missing')} | {alignment.get('summary', 'no summary')}"
        )
    if product_spec:
        lines.append(
            f"Product spec: {product_spec.get('status', 'missing')} | {product_spec.get('customer', 'no customer')} / {product_spec.get('painfulProblem', 'no problem')}"
        )
    if mfdr:
        lines.append(
            f"MFDR: {mfdr.get('status', 'missing')} | {mfdr.get('title', 'no title')} | open questions {len(mfdr.get('openQuestions', []))}"
        )
    lines.append(f"Uncommitted files: {status_count}")
    if open_gaps:
        lines.append(f"Open gaps: {'; '.join(open_gaps)}")
    if open_tasks:
        lines.append(f"Open tasks: {'; '.join(open_tasks)}")
    lines.append("")
    lines.append("Recent commits:")
    lines.append(recent_commits or "(none)")
    lines.append("")
    lines.append("Active task:")
    lines.append(current_task)
    lines.append("</session-context>")

    print("\n".join(lines))


if __name__ == "__main__":
    main()
