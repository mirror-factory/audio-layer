# OpenAI Codex Runtime Support

This starter treats Codex as a first-class agent runtime. Claude Code remains supported, but `.ai-starter/` is the source of truth shared by both runtimes.

## Official Codex Surface

Codex supports the pieces this starter needs:

- `AGENTS.md` project instructions: <https://developers.openai.com/codex/guides/agents-md>
- Project `.codex/config.toml` and `.codex/hooks.json`: <https://developers.openai.com/codex/hooks>
- Lifecycle hooks such as `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, and `Stop`: <https://developers.openai.com/codex/hooks>
- Non-interactive automation with `codex exec --json`: <https://developers.openai.com/codex/noninteractive>
- OpenAI Docs MCP: <https://developers.openai.com/learn/docs-mcp>

## Files The Starter Generates

```text
AGENTS.md
.codex/config.toml
.codex/hooks.json
.codex/hooks/session-startup.py
.codex/hooks/user-prompt-submit.py
.codex/hooks/pretool-install-research.py
.codex/hooks/pretool-plan-gate.py
.codex/hooks/posttool-telemetry.py
.codex/hooks/posttool-scaffold.py
.codex/hooks/posttool-failure-telemetry.py
.codex/hooks/periodic-reground.py
.codex/hooks/stop-check.py
.ai-starter/manifests/runtimes.json
.evidence/codex-runtime/report.json
```

## Runtime Contract

Codex reads `AGENTS.md` as the portable project contract. The starter adds runtime-specific wiring in `.codex/` and keeps durable product state in `.ai-starter/`.

The important separation is:

- `AGENTS.md`: stable instructions and starter workflow.
- `.codex/config.toml`: Codex feature flags and OpenAI Docs MCP setup.
- `.codex/hooks.json`: Codex lifecycle hook wiring.
- `.codex/hooks/*`: local hook scripts.
- `.ai-starter/*`: shared manifests, plans, scorecards, telemetry, docs, features, evidence, cost records, and reports.

## Hook Behavior

Codex hooks mirror the starter's Claude hook intent:

- `SessionStart` loads plan, scorecard, research, progress, and repo state.
- `UserPromptSubmit` adds intake guidance before feature-sized work.
- `PreToolUse` blocks dependency changes without current research and feature writes without an active plan.
- `PostToolUse` records telemetry and companion obligations.
- `Stop` blocks weak completion when required scorecard, gates, visual proof, reports, or evidence are missing.

Codex supports JSON hook responses for context and decisions, and it also supports exit code `2` with stderr for block/continuation feedback. The starter uses shared hook scripts where possible so runtime behavior does not drift.

## OpenAI Docs MCP

The starter writes this into `.codex/config.toml`:

```toml
[features]
codex_hooks = true

[mcp_servers.openaiDeveloperDocs]
url = "https://developers.openai.com/mcp"
```

You can also install the server globally:

```bash
codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp
codex mcp list
```

Use official OpenAI docs for OpenAI API, Codex, SDK, model, and MCP questions before relying on memory.

## Proof Commands

Static proof:

```bash
pnpm test:codex-runtime
```

Optional live proof:

```bash
AI_STARTER_RUN_CODEX_RUNTIME=1 pnpm test:codex-runtime
```

The live proof defaults to `gpt-5.2` because older Codex CLI builds can reject newer model IDs. Override with `AI_STARTER_CODEX_MODEL=<model>` when your local Codex version supports a newer model.

Release proof:

```bash
pnpm test:release
```

Clean-room install examples:

```bash
pnpm exec ai-starter-kit init --runtime codex
pnpm exec ai-starter-kit init --runtime claude-code,codex
```

The dashboard reads `.ai-starter/manifests/runtimes.json` so `/control-plane` can show runtime configuration, observed events, proof status, and warnings.

When `pnpm test:codex-runtime` passes, it writes `.evidence/codex-runtime/report.json`. It also appends a `CodexRuntimeProof` event to `.ai-starter/runs/telemetry.jsonl` so the dashboard can show Codex as observed after a successful static or live runtime proof. Live proof additionally captures `codex exec --json` output in `.evidence/codex-runtime/codex-runtime.stdout.jsonl`.
