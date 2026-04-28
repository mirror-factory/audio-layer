#!/usr/bin/env python3
"""InstructionsLoaded hook.

Lightweight install verification so every session knows whether the starter
system is actually present before stricter hooks start relying on it.
"""

from __future__ import annotations

from starter_hook_utils import PLAN_FILE, STARTER_TRACKING_FILE, append_event, read_json, repo_path


def main() -> None:
    manifest_path = repo_path(".ai-starter", "manifests", "starter.json")
    docs_path = repo_path(".ai-starter", "manifests", "docs.json")

    lines = ["<starter-system>"]
    if not STARTER_TRACKING_FILE.exists() or not manifest_path.exists():
        append_event(
            phase="InstructionsLoaded",
            hook="instructions-loaded.py",
            outcome="observed",
            classification="observer",
            blocks=False,
            reason="starter-incomplete",
        )
        lines.append(
            "Starter system is incomplete. Run `pnpm sync` or `npx @hustle-together/ai-starter-kit sync`."
        )
        lines.append("</starter-system>")
        print("\n".join(lines))
        return

    manifest = read_json(manifest_path, {})
    docs_registry = read_json(docs_path, []) if docs_path.exists() else []
    enabled = manifest.get("enabledModules", [])
    commands = manifest.get("commands", [])
    append_event(
        phase="InstructionsLoaded",
        hook="instructions-loaded.py",
        outcome="observed",
        classification="observer",
        blocks=False,
        reason="starter-ready",
        details={
            "modules": len(enabled),
            "commands": len(commands),
            "docsEntries": len(docs_registry) if isinstance(docs_registry, list) else 0,
        },
    )
    lines.append(
        f"Policy: {manifest.get('policyProfile', 'strict')} | Modules: {len(enabled)} | Commands: {', '.join(commands[:5])}"
    )
    lines.append(
        f"Docs registry: {len(docs_registry) if isinstance(docs_registry, list) else 0} entries"
    )
    if not PLAN_FILE.exists():
        lines.append(
            'No active plan artifact. Run `pnpm plan -- "<task>"` before feature work.'
        )
    lines.append("</starter-system>")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
