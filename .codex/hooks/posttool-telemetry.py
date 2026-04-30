#!/usr/bin/env python3
"""PostToolUse hook for starter telemetry and session tracking."""

from __future__ import annotations

import json
import subprocess

from starter_hook_utils import (
    HOOKS_DIR,
    PROGRESS_FILE,
    REPO_ROOT,
    SESSION_FILE,
    append_event,
    collect_paths,
    extract_command,
    extract_tool_input,
    extract_tool_name,
    normalize_path,
    now_iso,
    read_json,
    read_payload,
    write_json,
)

REGROUND_INTERVAL = 7
OBSERVER_STATE_FILE = HOOKS_DIR / "observer-state.json"


def load_observer_state() -> dict:
    if OBSERVER_STATE_FILE.exists():
        try:
            return json.loads(OBSERVER_STATE_FILE.read_text())
        except Exception:
            pass
    return {"observed_count": 0}


def save_observer_state(state: dict) -> None:
    OBSERVER_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    OBSERVER_STATE_FILE.write_text(json.dumps(state))


def run(cmd: list[str]) -> str:
    try:
        return subprocess.check_output(
            cmd,
            text=True,
            stderr=subprocess.DEVNULL,
            cwd=REPO_ROOT,
        ).strip()
    except Exception:
        return ""


def maybe_print_reground() -> None:
    state = load_observer_state()
    state["observed_count"] = int(state.get("observed_count", 0)) + 1
    count = state["observed_count"]
    save_observer_state(state)

    if count % REGROUND_INTERVAL != 0:
        return

    branch = run(["git", "branch", "--show-current"]) or "(detached)"
    status = run(["git", "status", "--short"])
    status_count = len(status.splitlines()) if status else 0
    recent = run(["git", "log", "--oneline", "-1"]) or "(none)"

    plan_summary = "(no active plan)"
    plan_path = REPO_ROOT / ".ai-starter/plans/latest.json"
    if plan_path.exists():
        try:
            plan = json.loads(plan_path.read_text())
            plan_summary = f"{plan.get('classification', 'task')}: {plan.get('title', '(untitled)')}"
        except Exception:
            pass

    score_summary = "(no scorecard yet)"
    score_path = REPO_ROOT / ".ai-starter/runs/latest-scorecard.json"
    if score_path.exists():
        try:
            scorecard = json.loads(score_path.read_text())
            score_summary = f"{scorecard.get('score', '?')}/100 with {len(scorecard.get('blockers', []))} blocker(s)"
        except Exception:
            pass

    alignment_summary = "(no alignment yet)"
    alignment_path = REPO_ROOT / ".ai-starter/manifests/alignment.json"
    if alignment_path.exists():
        try:
            alignment = json.loads(alignment_path.read_text())
            gaps = alignment.get("openGaps") or []
            alignment_summary = f"{alignment.get('status', 'missing')}: {alignment.get('summary', 'no summary')} | gaps {len(gaps)}"
        except Exception:
            pass

    print("\n".join([
        f'<reground turn="{count}">',
        f"Branch: {branch} | Uncommitted: {status_count} files | Last commit: {recent}",
        f"Plan: {plan_summary} | Scorecard: {score_summary}",
        f"Alignment: {alignment_summary}",
        "Reminder: read `.ai-starter/alignment/latest.md` before significant implementation and run `pnpm score` before handoff.",
        "</reground>",
    ]))


def main() -> None:
    payload = read_payload()
    tool_name = extract_tool_name(payload)
    tool_input = extract_tool_input(payload)
    command = extract_command(payload)
    paths = collect_paths(tool_input)

    append_event(
        phase="PostToolUse",
        hook="posttool-telemetry.py",
        outcome="observed",
        classification="observer",
        blocks=False,
        matcher="*",
        tool=tool_name,
        command=command,
        paths=paths,
        reason="tool-finished",
    )

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
    )
    existing_modified = [
        normalize_path(path)
        for path in (session.get("modifiedFiles") or [])
        if isinstance(path, str)
    ]
    modified = list(dict.fromkeys(existing_modified + paths))[:40]
    session["modifiedFiles"] = modified
    session["updatedAt"] = now_iso()
    write_json(SESSION_FILE, session)

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
    )
    existing_in_flight = [
        normalize_path(path)
        for path in (progress.get("filesInFlight") or [])
        if isinstance(path, str)
    ]
    progress["filesInFlight"] = list(
        dict.fromkeys(existing_in_flight + paths)
    )[:20]
    evidence_status = []
    for item in list(progress.get("evidenceStatus") or []):
        if isinstance(item, str) and item.startswith("observed-change:"):
            evidence_status.append(
                f"observed-change:{normalize_path(item.split(':', 1)[1])}"
            )
        elif isinstance(item, str):
            evidence_status.append(item)
    evidence_status = list(dict.fromkeys(evidence_status))
    for path in paths:
        note = f"observed-change:{path}"
        if note not in evidence_status:
            evidence_status.append(note)
    progress["evidenceStatus"] = evidence_status[-25:]
    progress["updatedAt"] = now_iso()
    write_json(PROGRESS_FILE, progress)
    maybe_print_reground()


if __name__ == "__main__":
    main()
