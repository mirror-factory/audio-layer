#!/usr/bin/env python3
"""PostToolUse hook -- re-inject starter state every 7 turns."""
import json
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
STATE_FILE = Path(__file__).resolve().parent / 'state.json'
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
        return subprocess.check_output(
            cmd,
            text=True,
            stderr=subprocess.DEVNULL,
            cwd=REPO_ROOT,
        ).strip()
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
    plan_summary = '(no active plan)'
    if (REPO_ROOT / '.ai-starter/plans/latest.json').exists():
        try:
            plan = json.loads((REPO_ROOT / '.ai-starter/plans/latest.json').read_text())
            plan_summary = f"{plan.get('classification', 'task')}: {plan.get('title', '(untitled)')}"
        except json.JSONDecodeError:
            pass
    score_summary = '(no scorecard yet)'
    if (REPO_ROOT / '.ai-starter/runs/latest-scorecard.json').exists():
        try:
            scorecard = json.loads((REPO_ROOT / '.ai-starter/runs/latest-scorecard.json').read_text())
            score_summary = f"{scorecard.get('score', '?')}/100 with {len(scorecard.get('blockers', []))} blocker(s)"
        except json.JSONDecodeError:
            pass

    lines = [
        f'<reground turn="{state["turn_count"]}">',
        f'Branch: {branch} | Uncommitted: {status_count} files | Last commit: {recent}',
        f'Plan: {plan_summary} | Scorecard: {score_summary}',
        'Reminder: Follow project patterns. Run `pnpm score` before finishing significant work.',
        '</reground>',
    ]
    print('\n'.join(lines))
    save_state(state)


if __name__ == '__main__':
    main()
