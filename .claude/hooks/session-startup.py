#!/usr/bin/env python3
"""
SessionStart hook -- injects current working state at conversation start.

Install to: .claude/hooks/session-startup.py
Wire in: .claude/settings.json -> hooks.SessionStart

Prevents "what was I doing?" drift between sessions by re-loading:
- Current git branch + recent commits + uncommitted files
- Active task from .claude/current-task.md (if present)
- Gate status from .evidence/gates/summary.json
- Research freshness warnings (if .claude/research/ exists)

Copied from vercel-ai-starter-kit. Customize for your project.
"""
import json
import subprocess
from pathlib import Path


def run(cmd: list[str]) -> str:
    try:
        return subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ''


def main() -> None:
    branch = run(['git', 'branch', '--show-current']) or '(detached)'
    status = run(['git', 'status', '--short'])
    recent_commits = run(['git', 'log', '--oneline', '-3'])
    status_count = len(status.splitlines()) if status else 0

    task_file = Path('.claude/current-task.md')
    current_task = task_file.read_text().strip() if task_file.exists() else '(no active task)'

    gates_file = Path('.evidence/gates/summary.json')
    gate_status = '(not yet run)'
    if gates_file.exists():
        try:
            data = json.loads(gates_file.read_text())
            required = data.get('required', {})
            recommended = data.get('recommended', {})
            gate_status = (
                f"required {required.get('passed', '?')}/{required.get('total', '?')}, "
                f"recommended {recommended.get('passed', '?')}/{recommended.get('total', '?')}"
            )
        except (json.JSONDecodeError, KeyError):
            pass

    research_index = Path('.claude/research/index.json')
    research_status = None
    if research_index.exists():
        try:
            idx = json.loads(research_index.read_text())
            entries = idx.get('entries', [])
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            stale = []
            for entry in entries:
                valid_until = entry.get('validUntil')
                if not valid_until:
                    continue
                try:
                    vu = datetime.fromisoformat(valid_until.replace('Z', '+00:00'))
                    if vu < now:
                        stale.append(entry.get('id', '?'))
                except ValueError:
                    pass
            research_status = f"STALE: {', '.join(stale)}" if stale else f"all {len(entries)} fresh"
        except (json.JSONDecodeError, KeyError):
            pass

    lines = ['<session-context>']
    lines.append(f'Branch: {branch}')
    lines.append(f'Gate status: {gate_status}')
    if research_status:
        lines.append(f'Research: {research_status}')
    lines.append(f'Uncommitted files: {status_count}')
    lines.append('')
    lines.append('Recent commits:')
    lines.append(recent_commits or '(none)')
    lines.append('')
    lines.append('Active task:')
    lines.append(current_task)
    lines.append('</session-context>')

    print('\n'.join(lines))


if __name__ == '__main__':
    main()
