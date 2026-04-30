#!/usr/bin/env python3
"""Shared helpers for starter agent runtime hooks."""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path


HOOKS_DIR = Path(__file__).resolve().parent
REPO_ROOT = HOOKS_DIR.parent.parent
RUNTIME_ID = "codex" if HOOKS_DIR.parent.name == ".codex" else "claude-code"


def repo_path(*parts: str) -> Path:
    return REPO_ROOT.joinpath(*parts)


STARTER_TRACKING_FILE = repo_path(".ai-starter-kit.json")
TELEMETRY_FILE = repo_path(".ai-starter", "runs", "telemetry.jsonl")
SESSION_FILE = repo_path(".ai-starter", "session.json")
PROGRESS_FILE = repo_path(".ai-starter", "progress.json")
PLAN_FILE = repo_path(".ai-starter", "plans", "latest.json")
SETUP_CONFIG_FILE = repo_path(".ai-starter", "config.json")
PRODUCT_VALIDATION_FILE = repo_path(".ai-starter", "product-validation", "latest.json")
PRODUCT_VALIDATION_MANIFEST_FILE = repo_path(".ai-starter", "manifests", "product-validation.json")
PRODUCT_SPEC_FILE = repo_path(".ai-starter", "product-spec", "latest.json")
PRODUCT_SPEC_MANIFEST_FILE = repo_path(".ai-starter", "manifests", "product-spec.json")
MFDR_FILE = repo_path(".ai-starter", "mfdr", "latest.json")
MFDR_MANIFEST_FILE = repo_path(".ai-starter", "manifests", "mfdr.json")
ALIGNMENT_FILE = repo_path(".ai-starter", "alignment", "latest.json")
ALIGNMENT_MANIFEST_FILE = repo_path(".ai-starter", "manifests", "alignment.json")
SCORECARD_FILE = repo_path(".ai-starter", "runs", "latest-scorecard.json")
GATES_FILE = repo_path(".evidence", "gates", "summary.json")
def first_existing_path(*paths: Path) -> Path:
    for path in paths:
        if path.exists():
            return path
    return paths[0]


RESEARCH_INDEX_FILE = first_existing_path(
    repo_path(".ai-starter", "research", "index.json"),
    repo_path(".codex", "research", "index.json"),
    repo_path(".claude", "research", "index.json"),
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def read_payload() -> dict:
    try:
        import sys

        raw = sys.stdin.read().strip()
        return json.loads(raw) if raw else {}
    except Exception:
        return {}


def read_json(path: Path, fallback):
    try:
        return json.loads(path.read_text()) if path.exists() else fallback
    except Exception:
        return fallback


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n")


def extract_tool_name(payload: dict) -> str:
    return str(
        payload.get("tool_name")
        or payload.get("tool")
        or payload.get("name")
        or "unknown"
    )


def extract_tool_input(payload: dict) -> dict:
    tool_input = payload.get("tool_input") or payload.get("input") or {}
    return tool_input if isinstance(tool_input, dict) else {}


def extract_command(payload: dict) -> str:
    tool_input = extract_tool_input(payload)
    for key in ("command", "cmd", "text"):
        value = tool_input.get(key)
        if isinstance(value, str):
            return value
    return ""


def collect_paths(tool_input: dict) -> list[str]:
    paths: list[str] = []
    for key in ("file_path", "path", "target_file"):
        value = tool_input.get(key)
        if isinstance(value, str):
            paths.append(value)

    values = tool_input.get("paths")
    if isinstance(values, list):
        paths.extend(str(item) for item in values if isinstance(item, str))

    edits = tool_input.get("edits")
    if isinstance(edits, list):
        for edit in edits:
            if isinstance(edit, dict):
                value = edit.get("file_path") or edit.get("path")
                if isinstance(value, str):
                    paths.append(value)

    env_paths = os.environ.get("CLAUDE_FILE_PATHS", "")
    if env_paths:
        paths.extend([item for item in env_paths.split(":") if item])

    normalized = []
    seen = set()
    for path in paths:
        item = normalize_path(path)
        if item and item not in seen:
            normalized.append(item)
            seen.add(item)
    return normalized


def normalize_path(path: str) -> str:
    item = path.strip().strip('"').strip("'").replace("\\", "/")
    candidate = Path(item).expanduser()
    if candidate.is_absolute():
        try:
            return candidate.resolve().relative_to(REPO_ROOT).as_posix()
        except Exception:
            return candidate.as_posix()

    recovered = Path(f"/{item}")
    if recovered.is_absolute():
        try:
            return recovered.resolve().relative_to(REPO_ROOT).as_posix()
        except Exception:
            pass

    while item.startswith("./"):
        item = item[2:]
    if item.startswith("ai-starter/"):
        return f".{item}"
    if item.startswith("claude/"):
        return f".{item}"
    if item.startswith("codex/"):
        return f".{item}"
    return item


def surface_type_for(path: str) -> str:
    if path.startswith("components/"):
        return "component"
    if path.startswith("app/api/"):
        return "api"
    if path.startswith("app/"):
        return "route"
    if path.startswith(("lib/ai/", "lib/ai/tools/")):
        return "tool"
    if path.startswith(("docs/", "guides/", "reference/")):
        return "docs"
    if path.startswith((".ai-starter/", ".claude/", ".codex/")):
        return "starter"
    return "other"


def surface_types_for(paths: list[str]) -> list[str]:
    deduped = []
    seen = set()
    for path in paths:
        surface = surface_type_for(path)
        if surface not in seen:
            deduped.append(surface)
            seen.add(surface)
    return deduped


def latest_plan() -> dict:
    plan = read_json(PLAN_FILE, {})
    return plan if isinstance(plan, dict) else {}


def progress_state() -> dict:
    progress = read_json(PROGRESS_FILE, {})
    return progress if isinstance(progress, dict) else {}


def current_plan_id() -> str | None:
    session = read_json(SESSION_FILE, {})
    progress = progress_state()
    plan = latest_plan()
    plan_id = plan.get("id") if plan.get("status") != "done" else None
    return session.get("currentPlanId") or progress.get("currentPlanId") or plan_id


def current_task() -> str | None:
    session = read_json(SESSION_FILE, {})
    plan = latest_plan()
    task = session.get("currentTask")
    if task and task not in {"No active task yet", "(no active task)"}:
        return task
    return plan.get("title")


def append_event(
    *,
    phase: str,
    hook: str,
    outcome: str,
    classification: str,
    blocks: bool,
    matcher: str | None = None,
    gate: str | None = None,
    tool: str | None = None,
    command: str = "",
    paths: list[str] | None = None,
    reason: str | None = None,
    details: dict | None = None,
) -> dict:
    normalized_paths = paths or []
    event = {
        "id": f"{phase.lower()}-{uuid.uuid4().hex[:12]}",
        "timestamp": now_iso(),
        "phase": phase,
        "hook": hook,
        "outcome": outcome,
        "classification": classification,
        "blocks": blocks,
        "matcher": matcher,
        "gate": gate,
        "tool": tool,
        "command": command[:240],
        "paths": normalized_paths,
        "surfaceTypes": surface_types_for(normalized_paths),
        "planId": current_plan_id(),
        "currentTask": current_task(),
        "reason": reason,
        "runtime": RUNTIME_ID,
    }
    if details:
        event["details"] = {"runtime": RUNTIME_ID, **details}
    else:
        event["details"] = {"runtime": RUNTIME_ID}

    TELEMETRY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with TELEMETRY_FILE.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event) + "\n")

    return event
