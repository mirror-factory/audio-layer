#!/usr/bin/env python3
"""PostToolUse hook for companion-surface planning.

This does not create framework-specific files blindly. It records missing
companions so `/score`, dashboards, and future automation can act on them.
"""

from __future__ import annotations

from starter_hook_utils import (
    PROGRESS_FILE,
    REPO_ROOT,
    append_event,
    collect_paths,
    extract_tool_input,
    now_iso,
    read_json,
    read_payload,
    write_json,
)
COMPANIONS_FILE = REPO_ROOT / ".ai-starter/manifests/companions.json"


def any_match(patterns: list[str]) -> bool:
    for pattern in patterns:
        if any(REPO_ROOT.glob(pattern)):
            return True
    return False


def route_slug_from_path(path: str) -> str:
    if path.startswith("app/api/"):
        return path.replace("app/api/", "").replace("/route.ts", "").replace("/", "-")
    return path.replace("app/", "").replace("/page.tsx", "").replace("/", "-") or "root"


def task_from_source_path(path: str, previous: dict | None = None) -> dict | None:
    from pathlib import Path

    file_path = Path(path)
    stem = file_path.stem

    if path.startswith("components/") and file_path.suffix == ".tsx" and ".stories." not in path:
        obligations = {
            "unit-test": any_match(
                [
                    f"tests/**/*{stem}*.test.ts",
                    f"tests/**/*{stem}*.test.tsx",
                    f"components/{stem}.test.tsx",
                ]
            ),
            "storybook": any_match([f"components/{stem}.stories.tsx"]),
            "visual-check": any_match(
                [
                    f"tests/**/*{stem}*.spec.ts",
                    f"tests/**/*{stem}*.spec.tsx",
                    f".evidence/**/*{stem}*.png",
                ]
            ),
        }
        kind = "component"
    elif path.startswith("app/api/") and file_path.name == "route.ts":
        slug = route_slug_from_path(path)
        obligations = {
            "integration-test": any_match(
                [
                    f"tests/**/*{slug}*.test.ts",
                    f"tests/**/*{slug}*.spec.ts",
                    f"tests/**/*{slug}*.ts",
                ]
            ),
            "contract-check": any_match(
                [
                    f"tests/**/*{slug}*contract*.ts",
                    f"tests/**/*{slug}*.test.ts",
                ]
            ),
            "documentation": any_match(
                [f"docs/**/*{slug}*.md", f"guides/**/*{slug}*.md"]
            ),
        }
        kind = "api"
        stem = slug
    elif path.startswith("app/") and file_path.name == "page.tsx":
        slug = route_slug_from_path(path)
        obligations = {
            "playwright-smoke": any_match(
                [
                    f"tests/e2e/**/*{slug}*.spec.ts",
                    f"tests/e2e/**/*{slug}*.spec.tsx",
                ]
            ),
            "screenshot": any_match([f".evidence/**/*{slug}*.png"]),
            "documentation": any_match(
                [f"docs/**/*{slug}*.md", f"guides/**/*{slug}*.md"]
            ),
        }
        kind = "route"
        stem = slug
    elif path.startswith(("lib/ai/", "lib/ai/tools/")) and file_path.suffix in {".ts", ".tsx"}:
        obligations = {
            "unit-test": any_match(
                [f"tests/**/*{stem}*.test.ts", f"tests/**/*{stem}*.test.tsx"]
            ),
            "eval": any_match([f"evals/**/*{stem}*.ts", f"evals/**/*{stem}*.json"]),
            "rubric": any_match(
                [f".evidence/**/*{stem}*rubric*.json", f".evidence/**/*{stem}*.json"]
            ),
        }
        kind = "tool"
    elif path.startswith(("lib/integrations/", "lib/services/", "lib/providers/")) and file_path.suffix in {".ts", ".tsx", ".js", ".jsx"}:
        obligations = {
            "integration-test": any_match(
                [
                    f"tests/**/*{stem}*.test.ts",
                    f"tests/**/*{stem}*.spec.ts",
                    f"tests/integration/**/*{stem}*.ts",
                ]
            ),
            "contract-check": any_match(
                [
                    f"tests/**/*{stem}*contract*.ts",
                    f"tests/**/*{stem}*.test.ts",
                ]
            ),
            "failure-modes": any_match(
                [
                    f"tests/**/*{stem}*failure*.ts",
                    f"tests/**/*{stem}*edge*.ts",
                    f"tests/**/*{stem}*error*.ts",
                ]
            ),
            "documentation": any_match(
                [f"docs/**/*{stem}*.md", f"guides/**/*{stem}*.md"]
            ),
        }
        kind = "external-integration"
    else:
        return None

    suggested = list(obligations.keys())
    satisfied = [name for name, is_ready in obligations.items() if is_ready]
    missing = [name for name, is_ready in obligations.items() if not is_ready]

    return {
        "id": f"{kind}:{stem}",
        "path": path,
        "kind": kind,
        "sourcePaths": [path],
        "suggested": suggested,
        "satisfied": satisfied,
        "missing": missing,
        "status": "pending" if missing else "satisfied",
        "updatedAt": now_iso(),
        "lastObservedAt": previous.get("lastObservedAt") if previous else now_iso(),
    }


def companion_summary(task: dict) -> str:
    if task["status"] == "pending":
        return f"Add companions for {task['path']}: {', '.join(task['missing'])}"
    return f"Companions satisfied for {task['path']}"


def main() -> None:
    payload = read_payload()
    tool_input = extract_tool_input(payload)
    paths = collect_paths(tool_input)

    companions = read_json(COMPANIONS_FILE, {"updatedAt": now_iso(), "tasks": []})
    by_id = {
        task["id"]: task
        for task in companions.get("tasks", [])
        if isinstance(task, dict) and task.get("id")
    }

    changed = []
    for path in paths:
        previous = next(
            (task for task in by_id.values() if task.get("path") == path),
            None,
        )
        task = task_from_source_path(path, previous)
        if task:
            changed.append(task["id"])
            by_id[task["id"]] = task

    refreshed = []
    for task_id, task in list(by_id.items()):
        refreshed_task = task_from_source_path(task["path"], task)
        if refreshed_task:
            refreshed.append(refreshed_task)
            by_id[task_id] = refreshed_task

    tasks = sorted(by_id.values(), key=lambda item: item["id"])
    companions["updatedAt"] = now_iso()
    companions["tasks"] = tasks
    write_json(COMPANIONS_FILE, companions)

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
    remaining_open = [
        item
        for item in progress.get("openTasks", [])
        if not isinstance(item, str) or not item.startswith(("Add companions for ", "Companions satisfied for "))
    ]
    remaining_closed = [
        item
        for item in progress.get("closedTasks", [])
        if not isinstance(item, str) or not item.startswith(("Add companions for ", "Companions satisfied for "))
    ]

    for task in tasks:
        summary = companion_summary(task)
        if task["status"] == "pending":
            if summary not in remaining_open:
                remaining_open.append(summary)
        else:
            if summary not in remaining_closed:
                remaining_closed.append(summary)

    progress["openTasks"] = remaining_open[-25:]
    progress["closedTasks"] = remaining_closed[-25:]
    progress["evidenceStatus"] = [
        f"companions: {len([task for task in tasks if task['status'] == 'pending'])} pending / {len([task for task in tasks if task['status'] == 'satisfied'])} satisfied"
    ]
    progress["updatedAt"] = now_iso()
    write_json(PROGRESS_FILE, progress)

    if tasks:
        append_event(
            phase="PostToolUse",
            hook="posttool-scaffold.py",
            outcome="observed",
            classification="observer",
            blocks=False,
            matcher="Write|Edit|MultiEdit",
            tool=payload.get("tool_name") or payload.get("tool") or "unknown",
            paths=paths,
            reason="companions-refreshed",
            details={
                "pending": len([task for task in tasks if task["status"] == "pending"]),
                "satisfied": len([task for task in tasks if task["status"] == "satisfied"]),
                "changedTaskIds": changed,
            },
        )


if __name__ == "__main__":
    main()
