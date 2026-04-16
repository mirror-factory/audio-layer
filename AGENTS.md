# AI Starter Kit — Reference App

## Tech Stack
- Frontend: Next.js 15 (App Router), React 19, TypeScript
- Styling: Tailwind CSS v4
- AI: Vercel AI SDK v6 with AI Gateway
- Testing: Vitest (unit)
- Package Manager: pnpm

## AI SDK v6 Patterns (CRITICAL)
- Use `inputSchema` NOT `parameters` in tool definitions
- Use `toUIMessageStreamResponse()` NOT `toDataStreamResponse()`
- Message format: `message.parts[]` NOT `message.content`
- Tool part types: `part.type === 'tool-{toolName}'`
- Tool states: `input-streaming` | `input-available` | `output-available` | `output-error`
- `addToolOutput` NOT `addToolResult`
- `sendMessage` NOT `append`
- `convertToModelMessages()` must be `await`ed (async in v6)
- Multi-step client: `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls`

## Tool System
[COMPRESSED TOOL REGISTRY]|format: name|type|ui|category|description
|searchDocuments|server|custom|search|Search documents by query
|askQuestion|client|interactive|interview|Ask user a multiple-choice question
|updateSettings|server|silent|config|Update a configuration setting

## Registries (Single Source of Truth)
- Tool metadata: `lib/ai/tool-meta.ts` (TOOL_META)
- Tool definitions: `lib/ai/tools.ts` (allTools)
- Derived registry: `lib/registry.ts` (SILENT_TOOLS, CUSTOM_UI_TOOLS, TOOL_BY_NAME)
- All new tools MUST be in TOOL_META AND in allTools

## Testing
- `pnpm typecheck && pnpm test` — must pass before commit
- Registry sync test auto-validates TOOL_META <-> allTools match

## Observability
- EVERY `streamText`/`generateText` call MUST spread `telemetryConfig` from `@/lib/ai/telemetry`
- Console logging via `logAICall()` after completion
- Dashboard stub at `/observability`

## Key Files
- `app/api/chat/route.ts` — Chat API (streamText + tools + telemetry)
- `app/chat/page.tsx` — Chat UI (useChat, message.parts[], tool rendering)
- `lib/ai/tools.ts` — 3 tool definitions (server + client)
- `lib/ai/tool-meta.ts` — Tool metadata registry
- `lib/ai/telemetry.ts` — Telemetry config + console logger
- `lib/registry.ts` — Derived sets (SILENT_TOOLS, CUSTOM_UI_TOOLS, etc.)
- `components/chat-message.tsx` — Message renderer (text, reasoning, tool parts)
- `components/tool-card.tsx` — Generic tool card UI
- `components/chat-input.tsx` — Textarea + submit

## Common Gotchas
- Client-side tools (askQuestion) have NO execute function — they pause the stream
- Tool parts have `part.type === 'tool-{toolName}'`, strip the 'tool-' prefix to get the name
- Silent tools should render nothing in the chat UI
- Use `sendMessage({ text })` not `append`
