#!/usr/bin/env python3
"""
PostToolUse Write|Edit hook -- auto-format changed files with prettier.
Fails silently if prettier is not installed. Non-blocking.

Install to: .claude/hooks/postuse-format.py
Wire in: .claude/settings.json -> hooks.PostToolUse[matcher="Write|Edit"]

Copied from vercel-ai-starter-kit. Customize for your project.
"""
import os
import subprocess

SUPPORTED_EXTS = {'.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css'}


def main() -> None:
    file_paths = os.environ.get('CLAUDE_FILE_PATHS', '')
    if not file_paths:
        return

    for path in file_paths.split(':'):
        path = path.strip()
        if not path:
            continue
        if not any(path.endswith(ext) for ext in SUPPORTED_EXTS):
            continue

        try:
            subprocess.run(
                ['pnpm', 'exec', 'prettier', '--write', path],
                capture_output=True,
                timeout=15,
            )
        except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
            pass


if __name__ == '__main__':
    main()
