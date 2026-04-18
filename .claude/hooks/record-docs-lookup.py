#!/usr/bin/env python3
"""
Record that a Context7 / docs lookup for a flagged library happened. Called
by PostToolUse on WebFetch / MCP tool calls, and manually by the agent when
it can't use a hook (bypass flow).

Usage:
  echo '<tool-payload-json>' | python3 record-docs-lookup.py          # from hook stdin
  python3 record-docs-lookup.py assemblyai,langfuse                   # manual record

Writes to .claude/hooks/state.json under `docs_lookups: { <library>: <ts> }`.
"""
import json
import re
import sys
import time
from pathlib import Path

STATE_FILE = Path('.claude/hooks/state.json')

FLAGGED_LIBRARIES = [
    'assemblyai', '@ai-sdk/', 'ai', 'langfuse', '@langfuse/',
    '@deepgram/sdk', '@anthropic-ai/sdk', '@anthropic-ai/claude-agent-sdk',
    'openai', '@google/generative-ai',
]

# URL patterns that indicate a docs read for each library. The PostToolUse
# hook matches WebFetch URLs against these and records the lookup.
URL_PATTERNS = {
    'assemblyai': re.compile(r'assemblyai\.com'),
    '@ai-sdk/': re.compile(r'ai-sdk\.dev|github\.com/vercel/ai'),
    'ai': re.compile(r'ai-sdk\.dev'),
    'langfuse': re.compile(r'langfuse\.com'),
    '@langfuse/': re.compile(r'langfuse\.com'),
    '@deepgram/sdk': re.compile(r'(developers\.|docs\.)?deepgram\.com'),
    '@anthropic-ai/sdk': re.compile(r'docs\.anthropic\.com|platform\.claude\.com'),
    '@anthropic-ai/claude-agent-sdk': re.compile(r'docs\.anthropic\.com|code\.claude\.com|platform\.claude\.com'),
    'openai': re.compile(r'platform\.openai\.com|openai\.com/docs'),
    '@google/generative-ai': re.compile(r'ai\.google\.dev|aistudio\.google\.com'),
}


def record(libs: list[str]) -> None:
    STATE_FILE.parent.mkdir(exist_ok=True)
    state = {}
    if STATE_FILE.exists():
        try:
            state = json.loads(STATE_FILE.read_text())
        except json.JSONDecodeError:
            pass
    lookups = state.get('docs_lookups', {})
    now = time.time()
    for lib in libs:
        lookups[lib] = now
    state['docs_lookups'] = lookups
    STATE_FILE.write_text(json.dumps(state, indent=2))


def main() -> None:
    # Manual invocation: `python3 record-docs-lookup.py assemblyai,langfuse`
    if len(sys.argv) > 1 and sys.argv[1]:
        libs = [l.strip() for l in sys.argv[1].split(',') if l.strip()]
        record(libs)
        print(f'Recorded docs lookup for: {", ".join(libs)}')
        return

    # Hook invocation: read tool payload from stdin, extract URL, match.
    try:
        payload = json.loads(sys.stdin.read()) if not sys.stdin.isatty() else {}
    except (json.JSONDecodeError, IOError):
        return

    url = payload.get('tool_input', {}).get('url', '') or payload.get('tool_input', {}).get('libraryName', '')
    if not url:
        return

    matched = [lib for lib, pattern in URL_PATTERNS.items() if pattern.search(url)]
    if matched:
        record(matched)


if __name__ == '__main__':
    main()
