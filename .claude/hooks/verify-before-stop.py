#!/usr/bin/env python3
"""
Stop hook — blocks the agent from finishing if edited files require
runtime verification that hasn't been performed yet.

Install to: .claude/hooks/verify-before-stop.py
Wire in: .claude/settings.json -> hooks.Stop

Exit codes:
  0 — continue (nothing needs verification, or already verified)
  2 — BLOCK (edited files need runtime verification before stopping)

How it works:
  1. Reads state.json for files edited this session (tracked by PostToolUse hooks)
  2. Matches edited files against VERIFICATION_RULES — patterns that require
     specific verification commands to have been run
  3. Checks last_verified timestamps — was the verification run AFTER the edit?
  4. If any rule is unsatisfied, prints what's missing and blocks.

Requires: verify-claims.py (PostToolUse Bash hook) to record verification timestamps.
          PostToolUse Write|Edit hooks to record edited file paths in state.json.

Copied from vercel-ai-starter-kit. Customize VERIFICATION_RULES for your project.
"""
import json
import sys
import time
from pathlib import Path

STATE_FILE = Path('.claude/hooks/state.json')

# How many seconds of grace — verification must be this recent relative to the edit
FRESHNESS_WINDOW = 300  # 5 minutes

# Rules: if an edited file matches the glob prefix, the listed verification keys
# must have a last_verified timestamp AFTER the edit timestamp.
# Keys correspond to what verify-claims.py records (test, typecheck, build, e2e, etc.)
# Plus a special 'curl' key for runtime API verification.
#
# Defaults cover common Next.js + AI SDK patterns.
# Customize for your project — add stricter rules as your test infra grows.
#
# Philosophy: every layer of the stack that could regress gets tested.
# It's not about saving tokens — it's about catching regressions in
# implementation, UI, AI behavior, and API contracts before they ship.
#
# Verification keys (recorded by verify-claims.py):
#   test       = pnpm test (unit/vitest)
#   typecheck  = pnpm typecheck / npx tsc
#   e2e        = pnpm test:e2e (Playwright)
#   storybook  = pnpm storybook:build
#   build      = pnpm build
#   eval-chat  = pnpm eval:chat
#   eval-db    = pnpm eval:db
#   ai-test    = pnpm test:ai (Expect AI-powered)
#   curl       = curl (manual endpoint verification)
#   dev-server = pnpm dev
#
VERIFICATION_RULES: list[dict] = [
    # --- API routes: unit + typecheck + REAL route exercise ---
    # route-exercise is the key lesson from the silent-500 class of bugs.
    # Unit tests mock external clients and pass while the real server rejects
    # the payload. Typecheck accepts deprecated fields the SDK still declares.
    # Only a real call against the running server proves the route works.
    # See verify-claims.py for what commands satisfy `route-exercise`.
    {
        'pattern': 'app/api/',
        'label': 'API route',
        'requires': ['test', 'typecheck', 'route-exercise'],
        'suggest': (
            'Run `pnpm typecheck && pnpm test`, then hit the route against a '
            'running server: `curl http://localhost:3000/api/<route>` with a '
            'realistic payload, or run `pnpm test:api` / Playwright API tests. '
            'Mocks alone cannot prove the server accepts the request.'
        ),
    },
    # --- AI pipeline: unit + typecheck ---
    {
        'pattern': 'lib/ai/',
        'label': 'AI pipeline code',
        'requires': ['test', 'typecheck'],
        'suggest': 'Run `pnpm typecheck && pnpm test` to validate AI pipeline changes.',
    },
    # --- UI components: typecheck + Storybook ---
    {
        'pattern': 'components/',
        'label': 'UI component',
        'requires': ['typecheck'],
        'suggest': (
            'Run `pnpm typecheck`. If Storybook is configured, also run '
            '`pnpm storybook:build` to verify component rendering.'
        ),
    },
    # --- Database / persistence ---
    {
        'pattern': 'lib/supabase/',
        'label': 'Supabase client code',
        'requires': ['test', 'typecheck'],
        'suggest': 'Run `pnpm typecheck && pnpm test` to validate DB changes.',
    },
    {
        'pattern': 'lib/db/',
        'label': 'Database code',
        'requires': ['test', 'typecheck'],
        'suggest': 'Run `pnpm typecheck && pnpm test` to validate DB changes.',
    },
    # --- Pages / routes ---
    {
        'pattern': 'app/',
        'label': 'App route/page',
        'requires': ['typecheck'],
        'suggest': 'Run `pnpm typecheck` to validate page/route changes.',
    },
    # --- Shared libs ---
    {
        'pattern': 'lib/',
        'label': 'Shared library code',
        'requires': ['test'],
        'suggest': 'Run `pnpm test` to validate library changes.',
    },
]


def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except json.JSONDecodeError:
            pass
    return {}


def main() -> None:
    state = load_state()
    edited_files: dict[str, float] = state.get('edited_files', {})
    last_verified: dict[str, float] = state.get('last_verified', {})

    if not edited_files:
        sys.exit(0)  # nothing was edited — all clear

    # Check each edited file against verification rules
    violations: list[dict] = []

    for file_path, edit_timestamp in edited_files.items():
        for rule in VERIFICATION_RULES:
            if rule['pattern'] not in file_path:
                continue

            # Check if ALL required verifications were run after this edit
            missing = []
            for req_key in rule['requires']:
                verified_at = last_verified.get(req_key, 0)
                if verified_at < edit_timestamp:
                    missing.append(req_key)

            if missing:
                violations.append({
                    'file': file_path,
                    'label': rule['label'],
                    'missing': missing,
                    'suggest': rule['suggest'],
                    'edited_ago': int(time.time() - edit_timestamp),
                })
            break  # first matching rule wins per file

    if not violations:
        sys.exit(0)

    # Group by suggestion to reduce noise
    lines = ['BLOCKED: Edited files require verification before stopping.\n']

    seen_suggestions: set[str] = set()
    for v in violations:
        missing_str = ', '.join(v['missing'])
        ago_str = f"{v['edited_ago']}s ago" if v['edited_ago'] < 120 else f"{v['edited_ago'] // 60}m ago"
        lines.append(f"  {v['file']} ({v['label']}, edited {ago_str})")
        lines.append(f"    Missing: {missing_str}")
        if v['suggest'] not in seen_suggestions:
            lines.append(f"    Fix: {v['suggest']}")
            seen_suggestions.add(v['suggest'])
        lines.append('')

    lines.append('Run the suggested commands, then try again.')

    print('\n'.join(lines))
    sys.exit(2)


if __name__ == '__main__':
    main()
