#!/usr/bin/env bash
# Codex sandbox bootstrap.
#
# Codex (OpenAI's cloud agent) runs this script when starting a task on this
# repo. It needs to be defensive because:
#
#   1. Internet access in the Codex sandbox can be spotty — ensure pnpm
#      uses the public registry directly.
#   2. Codex's environment template can leak stale `file:` references from
#      previous repos (e.g. `.../vercel-ai-starter-kit/.evidence/...tgz`).
#      `--frozen-lockfile` fails when those phantoms can't resolve.
#   3. node_modules from earlier sandbox runs can linger and confuse pnpm.
#
# Keep this script idempotent and side-effect-free outside the repo tree.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[codex-setup] cwd: $(pwd)"
echo "[codex-setup] node: $(node --version 2>/dev/null || echo 'missing')"

# 1. Wipe any sandbox-template residue that confuses pnpm
rm -rf node_modules
rm -rf .next

# 2. Activate pnpm via corepack (uses the version pinned in package.json)
corepack enable
corepack prepare pnpm@latest --activate >/dev/null 2>&1 || true

# 3. Install without frozen-lockfile so phantom file: refs from Codex's
#    environment template don't break the install. The lockfile in the
#    repo is correct; this flag just tells pnpm not to fail when the
#    sandbox happens to have stale references that don't exist on disk.
pnpm install --no-frozen-lockfile

echo "[codex-setup] install complete"
