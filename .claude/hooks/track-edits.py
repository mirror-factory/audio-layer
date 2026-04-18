#!/usr/bin/env python3
"""
PostToolUse Write|Edit hook — records which files were edited and when.
Completely silent — no output. Writes to state.json so that
verify-before-stop.py can check if verification was run after edits.

Install to: .claude/hooks/track-edits.py
Wire in: .claude/settings.json -> hooks.PostToolUse[matcher="Write|Edit"]

Copied from vercel-ai-starter-kit. No customization needed.
"""
import json
import os
import time
from pathlib import Path

STATE_FILE = Path('.claude/hooks/state.json')


def main() -> None:
    file_paths = os.environ.get('CLAUDE_FILE_PATHS', '')
    if not file_paths:
        return

    try:
        state = json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}
    except json.JSONDecodeError:
        state = {}

    if 'edited_files' not in state:
        state['edited_files'] = {}

    now = time.time()
    for path in file_paths.split(':'):
        path = path.strip()
        if path:
            state['edited_files'][path] = now

    STATE_FILE.parent.mkdir(exist_ok=True)
    STATE_FILE.write_text(json.dumps(state))


if __name__ == '__main__':
    main()
