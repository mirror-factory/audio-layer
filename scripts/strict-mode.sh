#!/usr/bin/env bash
# Toggle the AI Starter Kit's strict-mode hooks.
#
# Default state: hooks PARKED (lightweight mode).
#   .codex/hooks.json.strict   .claude/settings.json.strict
#
# Strict state: hooks ACTIVE.
#   .codex/hooks.json          .claude/settings.json
#
# Why: the live hooks fire on every agent turn and are noisy enough that
# they dominate routine edits. Lightweight is the default for daily work;
# flip strict on before a push or handoff to run the full gates.
#
# Usage:
#   scripts/strict-mode.sh on        # activate hooks (before push/handoff)
#   scripts/strict-mode.sh off       # park hooks (default lightweight mode)
#   scripts/strict-mode.sh status    # show current state
set -euo pipefail

cd "$(dirname "$0")/.."

CODEX_HOOKS=".codex/hooks.json"
CLAUDE_SETTINGS=".claude/settings.json"

cmd="${1:-status}"

case "$cmd" in
  on)
    [[ -f "${CODEX_HOOKS}.strict" ]] && mv "${CODEX_HOOKS}.strict" "$CODEX_HOOKS"
    [[ -f "${CLAUDE_SETTINGS}.strict" ]] && mv "${CLAUDE_SETTINGS}.strict" "$CLAUDE_SETTINGS"
    echo "[strict-mode] hooks ACTIVE — run pnpm sync && pnpm score && pnpm gates before push"
    ;;
  off)
    [[ -f "$CODEX_HOOKS" ]] && mv "$CODEX_HOOKS" "${CODEX_HOOKS}.strict"
    [[ -f "$CLAUDE_SETTINGS" ]] && mv "$CLAUDE_SETTINGS" "${CLAUDE_SETTINGS}.strict"
    echo "[strict-mode] hooks PARKED — lightweight day-to-day mode"
    ;;
  status)
    if [[ -f "$CODEX_HOOKS" || -f "$CLAUDE_SETTINGS" ]]; then
      echo "[strict-mode] ACTIVE"
    else
      echo "[strict-mode] PARKED (lightweight)"
    fi
    ;;
  *)
    echo "usage: $0 {on|off|status}"
    exit 1
    ;;
esac
