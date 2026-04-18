#!/usr/bin/env python3
"""
PostToolUse hook -- re-injects working state every 7 turns.
Prevents context drift in long sessions.

Install to: .claude/hooks/periodic-reground.py
Wire in: .claude/settings.json -> hooks.PostToolUse[matcher="*"]

Copied from vercel-ai-starter-kit. Customize for your project.
"""
import json
import subprocess
from pathlib import Path

STATE_FILE = Path('.claude/hooks/state.json')
REGROUND_INTERVAL = 7


def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except json.JSONDecodeError:
            pass
    return {'turn_count': 0}


def save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(exist_ok=True)
    STATE_FILE.write_text(json.dumps(state))


def run(cmd: list[str]) -> str:
    try:
        return subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ''


def main() -> None:
    state = load_state()
    state['turn_count'] = state.get('turn_count', 0) + 1

    if state['turn_count'] % REGROUND_INTERVAL != 0:
        save_state(state)
        return

    branch = run(['git', 'branch', '--show-current']) or '(detached)'
    status = run(['git', 'status', '--short'])
    status_count = len(status.splitlines()) if status else 0
    recent = run(['git', 'log', '--oneline', '-1']) or '(none)'

    lines = [
        f'<reground turn="{state["turn_count"]}">',
        f'Branch: {branch} | Uncommitted: {status_count} files | Last commit: {recent}',
        'Reminder: Follow project patterns. Run `pnpm typecheck && pnpm test` before commit.',
        '</reground>',
    ]
    print('\n'.join(lines))
    save_state(state)


if __name__ == '__main__':
    main()
