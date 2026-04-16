/**
 * Derived tool registry — auto-computed from tool-meta.ts at import time.
 *
 * Do not edit manually. All sets and maps are derived from TOOL_META.
 */

import { TOOL_META, type ToolMeta } from "./ai/tool-meta";

export type ToolRegistryEntry = ToolMeta & { name: string };

/** Array form for iteration */
export const TOOL_REGISTRY: ToolRegistryEntry[] = Object.entries(TOOL_META).map(
  ([name, meta]) => ({ name, ...meta }),
);

/** Set of tool names with ui: 'silent' (no visible chat output) */
export const SILENT_TOOLS = new Set(
  TOOL_REGISTRY.filter((t) => t.ui === "silent").map((t) => t.name),
);

/** Set of tool names with ui: 'custom' (rich result cards) */
export const CUSTOM_UI_TOOLS = new Set(
  TOOL_REGISTRY.filter((t) => t.ui === "custom").map((t) => t.name),
);

/** Set of tool names with ui: 'interactive' (client-side, user responds) */
export const INTERACTIVE_TOOLS = new Set(
  TOOL_REGISTRY.filter((t) => t.ui === "interactive").map((t) => t.name),
);

/** O(1) lookup by name */
export const TOOL_BY_NAME: Record<string, ToolRegistryEntry> =
  Object.fromEntries(TOOL_REGISTRY.map((t) => [t.name, t]));
