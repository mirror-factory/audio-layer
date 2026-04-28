#!/usr/bin/env python3
"""PostToolUseFailure hook for starter telemetry."""

from __future__ import annotations

from starter_hook_utils import append_event, extract_command, extract_tool_name, read_payload


def main() -> None:
    payload = read_payload()
    tool_name = extract_tool_name(payload)
    error_text = str(payload.get("error") or payload.get("tool_response") or "")[:400]

    append_event(
        phase="PostToolUseFailure",
        hook="posttool-failure-telemetry.py",
        outcome="error",
        classification="observer",
        blocks=False,
        matcher="*",
        tool=tool_name,
        command=extract_command(payload),
        reason="tool-failed",
        details={"error": error_text},
    )


if __name__ == "__main__":
    main()
