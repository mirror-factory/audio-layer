#!/usr/bin/env python3
"""Stop hook enforcing scorecard, gates, and starter-aware continuation pressure.

This is intentionally a fast decision hook. It does not run tests, Playwright,
or shell commands itself. When work remains, it blocks the stop and feeds the
active agent a compact next-action packet that points at the right starter
harness command.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from starter_hook_utils import (
    GATES_FILE,
    PLAN_FILE,
    PROGRESS_FILE,
    SCORECARD_FILE,
    SESSION_FILE,
    append_event,
    current_plan_id,
    read_json,
    read_payload,
    repo_path,
    write_json,
)

COMPANIONS_FILE = repo_path(".ai-starter", "manifests", "companions.json")
EVIDENCE_FILE = repo_path(".ai-starter", "manifests", "evidence.json")
BROWSER_PROOF_FILE = repo_path(".ai-starter", "manifests", "browser-proof.json")
LATEST_REPORT_FILE = repo_path(".ai-starter", "reports", "latest.md")
LATEST_EXPORT_FILE = repo_path(".ai-starter", "exports", "latest.json")
AUTOPILOT_STATE_FILE = repo_path(".ai-starter", "runs", "autopilot-stop-state.json")
AUTOPILOT_LEDGER_FILE = repo_path(".ai-starter", "runs", "autopilot-stop-ledger.jsonl")
TELEMETRY_FILE = repo_path(".ai-starter", "runs", "telemetry.jsonl")

HARD_STOP_MARKERS = (
    "HARD STOP",
    "BLOCKED",
    "NEEDS USER",
    "NEEDS HUMAN",
    "MISSING CREDENTIAL",
    "DESTRUCTIVE ACTION",
)


def telemetry_line_count() -> int:
    try:
        return len([line for line in TELEMETRY_FILE.read_text().splitlines() if line.strip()])
    except Exception:
        return 0


def read_transcript_tail(payload: dict, limit: int = 12_000) -> str:
    path_value = payload.get("transcript_path") or payload.get("transcriptPath")
    if not isinstance(path_value, str) or not path_value:
        return ""
    try:
        path = Path(path_value).expanduser()
        if not path.exists() or path.stat().st_size > 5_000_000:
            return ""
        return path.read_text(errors="ignore")[-limit:]
    except Exception:
        return ""


def hard_stop_requested(payload: dict) -> str | None:
    haystack = " ".join(
        str(value)
        for value in (
            payload.get("reason"),
            payload.get("message"),
            payload.get("stop_reason"),
            read_transcript_tail(payload),
        )
        if value
    ).upper()
    for marker in HARD_STOP_MARKERS:
        if marker in haystack:
            return marker
    return None


def autopilot_enabled(plan: dict) -> bool:
    if os.environ.get("AI_STARTER_AUTOPILOT_STOP") == "0":
        return False
    if os.environ.get("AI_STARTER_AUTOPILOT_STOP") == "1":
        return True
    policy = str(plan.get("policyProfile") or "").lower()
    if policy in {"off", "disabled"}:
        return False
    return True


def max_iterations(plan: dict) -> int:
    raw = os.environ.get("AI_STARTER_AUTOPILOT_STOP_MAX")
    if raw and raw.isdigit():
        return max(1, min(int(raw), 25))
    value = plan.get("maxAutopilotStopIterations")
    if isinstance(value, int):
        return max(1, min(value, 25))
    return 5


def append_autopilot_ledger(entry: dict) -> None:
    AUTOPILOT_LEDGER_FILE.parent.mkdir(parents=True, exist_ok=True)
    with AUTOPILOT_LEDGER_FILE.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry) + "\n")


def pending_companions() -> list[dict]:
    manifest = read_json(COMPANIONS_FILE, {}) or {}
    tasks = manifest.get("tasks") if isinstance(manifest, dict) else []
    if not isinstance(tasks, list):
        return []
    return [task for task in tasks if isinstance(task, dict) and task.get("status") == "pending"]


def has_screenshot_evidence() -> bool:
    browser = read_json(BROWSER_PROOF_FILE, {}) or {}
    if isinstance(browser, dict) and browser.get("screenshotPaths"):
        return True
    evidence = read_json(EVIDENCE_FILE, []) or []
    if isinstance(evidence, list):
        return any(
            isinstance(item, dict)
            and (
                item.get("kind") == "image"
                or str(item.get("path", "")).endswith((".png", ".jpg", ".jpeg", ".webp"))
            )
            for item in evidence
        )
    return False


def visual_work_detected(session: dict, progress: dict, plan: dict) -> bool:
    paths = []
    for key in ("modifiedFiles", "filesInFlight"):
        source = session.get(key) if key in session else progress.get(key)
        if isinstance(source, list):
            paths.extend(str(item) for item in source)
    text = " ".join(
        [
            str(plan.get("title", "")),
            str(plan.get("classification", "")),
            " ".join(str(item) for item in plan.get("requiredEvidence", []) if isinstance(item, str)),
            " ".join(paths),
        ]
    ).lower()
    return any(
        needle in text
        for needle in (
            "component",
            "page",
            "route",
            "visual",
            "design",
            "screenshot",
            "storybook",
            "app/",
            "components/",
            ".tsx",
            ".css",
        )
    )


def first_open_item(values) -> str | None:
    if not isinstance(values, list):
        return None
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def latest_report_ready() -> bool:
    try:
        return LATEST_REPORT_FILE.exists() and LATEST_REPORT_FILE.stat().st_size > 100
    except Exception:
        return False


def latest_export_ready() -> bool:
    export = read_json(LATEST_EXPORT_FILE, {}) or {}
    return isinstance(export, dict) and bool(export.get("archivePath"))


def next_action(
    *,
    plan: dict,
    scorecard,
    gate_summary: dict,
    session: dict,
    progress: dict,
    active_plan_id: str,
) -> dict | None:
    if not scorecard:
        return {
            "reason": "missing-scorecard",
            "summary": "An active plan exists but no scorecard has been generated.",
            "command": "pnpm sync && pnpm score",
            "action": "Generate the scorecard, then inspect the first blocker before trying to stop again.",
        }

    if scorecard.get("planId") not in {None, active_plan_id}:
        return {
            "reason": "stale-scorecard",
            "summary": "The latest scorecard does not match the active plan.",
            "command": "pnpm sync && pnpm score",
            "action": "Refresh starter manifests and score this active plan before stopping.",
        }

    blockers = scorecard.get("blockers", [])
    if isinstance(blockers, list) and blockers:
        first = str(blockers[0])
        return {
            "reason": "scorecard-blockers",
            "summary": f"The scorecard still has blockers. First blocker: {first}",
            "command": "pnpm sync && pnpm score",
            "action": f"Fix the first scorecard blocker, then rerun `pnpm sync` and `pnpm score`: {first}",
            "details": {"blockers": blockers[:5]},
        }

    required = gate_summary.get("required", {}) if isinstance(gate_summary, dict) else {}
    total_required = required.get("total")
    failed_required = required.get("failed")
    if total_required and failed_required:
        return {
            "reason": "required-gates-failing",
            "summary": "Required gates are still failing.",
            "command": "pnpm gates",
            "action": "Run `pnpm gates`, inspect the first failing evidence file, fix one failure, then rerun `pnpm sync` and `pnpm score`.",
        }

    companions = pending_companions()
    if companions:
        first = companions[0]
        missing = ", ".join(str(item) for item in first.get("missing", [])[:4]) or "verification"
        path = str(first.get("path") or first.get("id") or "unknown surface")
        return {
            "reason": "pending-companions",
            "summary": f"{len(companions)} companion obligation(s) are still pending.",
            "command": "pnpm companions",
            "action": f"Complete one companion obligation for `{path}`. Missing: {missing}. Add or repair the proof, then run `pnpm sync` and `pnpm score`.",
            "details": {"pendingCompanions": len(companions), "firstPath": path, "missing": missing},
        }

    open_task = first_open_item(progress.get("openTasks")) or first_open_item(session.get("openGaps"))
    if open_task:
        return {
            "reason": "open-progress-work",
            "summary": f"Progress still has open work: {open_task}",
            "command": "pnpm sync && pnpm score",
            "action": f"Resolve or explicitly close this open work item, then refresh score: {open_task}",
        }

    if visual_work_detected(session, progress, plan) and not has_screenshot_evidence():
        return {
            "reason": "missing-visual-proof",
            "summary": "Visual/page/component work is present but screenshot evidence is missing.",
            "command": "pnpm browser:proof",
            "action": "Run `pnpm browser:proof`, inspect `.evidence/screenshots`, fix one visible issue or missing visual assertion, then run `pnpm sync` and `pnpm score`.",
        }

    if not latest_report_ready():
        return {
            "reason": "missing-handoff-report",
            "summary": "The repo is green enough to hand off, but no current handoff report exists.",
            "command": "pnpm report",
            "action": "Run `pnpm report` so the next human or agent has a durable handoff file.",
        }

    if not latest_export_ready():
        return {
            "reason": "missing-evidence-export",
            "summary": "The repo is green enough to hand off, but no evidence export bundle exists.",
            "command": "pnpm evidence:export",
            "action": "Run `pnpm evidence:export` so the current work can be audited or handed to another agent.",
        }

    return None


def continuation_packet(
    *,
    action: dict,
    plan: dict,
    scorecard,
    session: dict,
    progress: dict,
    stop_hook_active: bool,
    count: int,
    budget: int,
) -> str:
    score = scorecard.get("score") if isinstance(scorecard, dict) else None
    blockers = scorecard.get("blockers", []) if isinstance(scorecard, dict) else []
    companions = pending_companions()
    visual_hint = "yes" if visual_work_detected(session, progress, plan) else "no"
    return "\n".join(
        [
            "Stop denied by AI Starter Autopilot.",
            "",
            "Why:",
            f"- {action['summary']}",
            f"- Plan: {plan.get('title') or session.get('currentTask') or 'active plan'}",
            f"- Score: {score if score is not None else 'not generated'}/100",
            f"- Blockers: {len(blockers) if isinstance(blockers, list) else 0}",
            f"- Pending companions: {len(companions)}",
            f"- Visual work detected: {visual_hint}",
            f"- Stop loop: {count}/{budget} (stop_hook_active={str(stop_hook_active).lower()})",
            "",
            "Next required action:",
            action["action"],
            "",
            "Command to run:",
            action["command"],
            "",
            "Available starter harness:",
            "- pnpm sync: refresh docs/features/evidence/hook manifests",
            "- pnpm score: update readiness score and blockers",
            "- pnpm gates: run typecheck/tests/storybook/drift/research gates",
            "- pnpm browser:proof: Playwright + Expect screenshots/replays",
            "- pnpm design:check: detect hardcoded design drift",
            "- pnpm companions: generate or inspect missing tests/docs/stories/specs",
            "- pnpm report: write handoff report",
            "- pnpm evidence:export: create review bundle",
            "- /control-plane: inspect repo state, evidence, costs, actions, and score",
            "- /observability: inspect runtime logs and AI calls",
            "",
            "Do not ask the user to continue. Continue unless blocked by missing credentials, destructive action, product ambiguity, repeated failure, or an explicit HARD STOP.",
            "",
        ]
    )


def register_autopilot_block(plan_id: str, action: dict, budget: int, stop_hook_active: bool) -> tuple[bool, int]:
    state = read_json(AUTOPILOT_STATE_FILE, {}) or {}
    action_key = f"{plan_id}:{action.get('reason')}:{action.get('command')}"
    line_count = telemetry_line_count()
    if (
        state.get("planId") != plan_id
        or state.get("actionKey") != action_key
        or state.get("telemetryLineCount") != line_count
    ):
        count = 1
    else:
        count = int(state.get("count", 0)) + 1

    next_state = {
        "planId": plan_id,
        "actionKey": action_key,
        "reason": action.get("reason"),
        "command": action.get("command"),
        "count": count,
        "maxIterations": budget,
        "telemetryLineCount": line_count,
        "stopHookActive": stop_hook_active,
    }
    write_json(AUTOPILOT_STATE_FILE, next_state)
    append_autopilot_ledger(next_state)
    return count <= budget, count


def main() -> None:
    payload = read_payload()
    plan = read_json(PLAN_FILE, {}) or {}
    scorecard = read_json(SCORECARD_FILE, None)
    gate_summary = read_json(GATES_FILE, {}) or {}
    session = read_json(SESSION_FILE, {}) or {}
    progress = read_json(PROGRESS_FILE, {}) or {}
    stop_hook_active = bool(payload.get("stop_hook_active"))

    active_plan_id = current_plan_id()
    if not active_plan_id:
        append_event(
            phase="Stop",
            hook="stop-check.py",
            outcome="allowed",
            classification="enforcer",
            blocks=True,
            reason="no-active-plan",
        )
        return

    hard_marker = hard_stop_requested(payload)
    if hard_marker:
        append_event(
            phase="Stop",
            hook="stop-check.py",
            outcome="allowed",
            classification="enforcer",
            blocks=True,
            reason="hard-stop-marker",
            details={"marker": hard_marker},
        )
        return

    if autopilot_enabled(plan):
        action = next_action(
            plan=plan,
            scorecard=scorecard,
            gate_summary=gate_summary,
            session=session,
            progress=progress,
            active_plan_id=active_plan_id,
        )
        if action:
            budget = max_iterations(plan)
            should_block, count = register_autopilot_block(
                active_plan_id,
                action,
                budget,
                stop_hook_active,
            )
            if should_block:
                append_event(
                    phase="Stop",
                    hook="stop-check.py",
                    outcome="blocked",
                    classification="enforcer",
                    blocks=True,
                    reason=f"autopilot-{action.get('reason')}",
                    details={
                        **(action.get("details") or {}),
                        "command": action.get("command"),
                        "count": count,
                        "maxIterations": budget,
                        "stopHookActive": stop_hook_active,
                    },
                )
                sys.stderr.write(
                    continuation_packet(
                        action=action,
                        plan=plan,
                        scorecard=scorecard,
                        session=session,
                        progress=progress,
                        stop_hook_active=stop_hook_active,
                        count=count,
                        budget=budget,
                    )
                )
                raise SystemExit(2)

            append_event(
                phase="Stop",
                hook="stop-check.py",
                outcome="allowed",
                classification="enforcer",
                blocks=True,
                reason="autopilot-budget-exhausted",
                details={
                    "command": action.get("command"),
                    "reason": action.get("reason"),
                    "count": count,
                    "maxIterations": budget,
                },
            )
            sys.stderr.write(
                "AI Starter Autopilot stop budget reached. Allowing stop so the agent can summarize the unresolved blocker.\n"
            )
            return

    if not scorecard:
        append_event(
            phase="Stop",
            hook="stop-check.py",
            outcome="blocked",
            classification="enforcer",
            blocks=True,
            reason="missing-scorecard",
        )
        sys.stderr.write(
            "Blocked stop because an active plan exists but no scorecard has been generated. "
            "Run `pnpm score` first.\n"
        )
        raise SystemExit(2)

    if scorecard.get("planId") not in {None, active_plan_id}:
        append_event(
            phase="Stop",
            hook="stop-check.py",
            outcome="blocked",
            classification="enforcer",
            blocks=True,
            reason="stale-scorecard",
            details={
                "activePlanId": active_plan_id,
                "scorecardPlanId": scorecard.get("planId"),
            },
        )
        sys.stderr.write(
            "Blocked stop because the latest scorecard does not match the active plan. "
            "Run `pnpm score` again before finishing.\n"
        )
        raise SystemExit(2)

    blockers = scorecard.get("blockers", [])
    if blockers:
        append_event(
            phase="Stop",
            hook="stop-check.py",
            outcome="blocked",
            classification="enforcer",
            blocks=True,
            reason="scorecard-blockers",
            details={"blockers": blockers[:5]},
        )
        sys.stderr.write(
            "Blocked stop because the current scorecard still has blockers: "
            + "; ".join(blockers[:5])
            + "\n"
        )
        raise SystemExit(2)

    required = gate_summary.get("required", {})
    total_required = required.get("total")
    failed_required = required.get("failed")
    if total_required and failed_required:
        append_event(
            phase="Stop",
            hook="stop-check.py",
            outcome="blocked",
            classification="enforcer",
            blocks=True,
            reason="required-gates-failing",
        )
        sys.stderr.write(
            "Blocked stop because required gates are still failing. Run `pnpm gates` and clear failures first.\n"
        )
        raise SystemExit(2)

    append_event(
        phase="Stop",
        hook="stop-check.py",
        outcome="allowed",
        classification="enforcer",
        blocks=True,
        reason="scorecard-clear",
    )


if __name__ == "__main__":
    main()
