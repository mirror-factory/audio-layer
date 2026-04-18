#!/usr/bin/env python3
"""
PostToolUse Bash hook — tracks which verification commands were actually run.
Completely silent — no output. Records timestamps in state.json so that
verify-before-stop.py can check: "You edited an API route but never ran tests."

Install to: .claude/hooks/verify-claims.py
Wire in: .claude/settings.json -> hooks.PostToolUse[matcher="Bash"]

Copied from vercel-ai-starter-kit. Customize VERIFICATION_COMMANDS for your project.
"""
import json
import os
import sys
import time
from pathlib import Path

STATE_FILE = Path('.claude/hooks/state.json')

# Map command substrings to verification keys.
# verify-before-stop.py references these keys in its VERIFICATION_RULES.
#
# Keys must match what VERIFICATION_RULES 'requires' arrays reference.
# Add project-specific commands here (evals, AI tests, etc.)
VERIFICATION_COMMANDS = {
    # Unit tests
    'pnpm test': 'test',
    'npx vitest': 'test',
    # Type checking
    'pnpm typecheck': 'typecheck',
    'npx tsc': 'typecheck',
    # E2E (Playwright)
    'pnpm test:e2e': 'e2e',
    'npx playwright': 'e2e',
    # Storybook
    'pnpm storybook:build': 'storybook',
    'pnpm storybook': 'storybook',
    # Build
    'pnpm build': 'build',
    # AI-powered testing (Expect)
    'pnpm test:ai': 'ai-test',
    'npx expect-cli': 'ai-test',
    # Evals (customize for your project)
    'pnpm eval:chat': 'eval-chat',
    'pnpm eval:db': 'eval-db',
    'pnpm eval:tools': 'eval-tools',
    'pnpm eval': 'eval',
    # Runtime verification
    'curl ': 'curl',
    'pnpm dev': 'dev-server',
    # Route exercise -- a real end-to-end call against the running server.
    # This is stronger than `curl` alone: it proves the full route actually
    # handles the request and returns a response. Matches direct curl against
    # localhost, start-server-and-test style scripts, and vitest/Playwright
    # test runs scoped to the API layer.
    'curl http://localhost': 'route-exercise',
    'curl localhost:': 'route-exercise',
    'pnpm test:api': 'route-exercise',
    'npx start-server-and-test': 'route-exercise',
    'playwright test tests/api': 'route-exercise',
    'vitest run tests/api': 'route-exercise',
    'pnpm test:route': 'route-exercise',
    # Quality gates
    'pnpm gates': 'gates',
    'pnpm lint': 'lint',
}


def main() -> None:
    # Read the command that was just executed
    try:
        input_data = json.loads(sys.stdin.read()) if not sys.stdin.isatty() else {}
    except (json.JSONDecodeError, IOError):
        input_data = {}

    command = input_data.get('tool_input', {}).get('command', '')
    if not command:
        command = os.environ.get('CLAUDE_BASH_COMMAND', '')
    if not command:
        return

    # Check if it matches a verification command
    matched_key = None
    for pattern, key in VERIFICATION_COMMANDS.items():
        if pattern in command:
            matched_key = key
            break

    if not matched_key:
        return

    # Record it
    try:
        state = json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}
    except json.JSONDecodeError:
        state = {}

    if 'last_verified' not in state:
        state['last_verified'] = {}

    state['last_verified'][matched_key] = time.time()
    STATE_FILE.parent.mkdir(exist_ok=True)
    STATE_FILE.write_text(json.dumps(state))


if __name__ == '__main__':
    main()
