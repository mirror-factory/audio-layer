/**
 * Derived tool registry — auto-computed from _metadata.ts.
 *
 * Do not edit manually. These sets and maps are derived at import time
 * from the single source of truth in TOOL_METADATA.
 *
 * Regenerate docs: `pnpm tools:generate`
 */

import { TOOL_METADATA, TOOL_METADATA_MAP } from "./_metadata";

// Re-export source of truth
export { TOOL_METADATA, TOOL_METADATA_MAP };

/** Set of tool names that are client-side (no server execute function) */
export const CLIENT_SIDE_TOOLS = new Set(
  TOOL_METADATA.filter((t) => t.clientSide).map((t) => t.name)
);

/** Tools grouped by category (Map<category, ToolMetadata[]>) */
export const TOOL_BY_CATEGORY = Map.groupBy(TOOL_METADATA, (t) => t.category);

/** Tools grouped by service (Map<service, ToolMetadata[]>) */
export const TOOL_BY_SERVICE = Map.groupBy(TOOL_METADATA, (t) => t.service);

/** Set of all tool names for fast membership checks */
export const ALL_TOOL_NAMES = new Set(TOOL_METADATA.map((t) => t.name));

/** Array of unique categories */
export const TOOL_CATEGORIES = [...new Set(TOOL_METADATA.map((t) => t.category))];

/** Array of unique services */
export const TOOL_SERVICES = [...new Set(TOOL_METADATA.map((t) => t.service))];
