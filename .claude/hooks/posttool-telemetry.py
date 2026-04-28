#!/usr/bin/env python3
"""PostToolUse hook for starter telemetry and session tracking."""

from __future__ import annotations

from starter_hook_utils import (
    PROGRESS_FILE,
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


if __name__ == "__main__":
    main()
