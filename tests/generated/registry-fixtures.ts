// DO NOT EDIT — generated from tool-meta.ts by generate-test-fixtures.ts
//
// Source: reference-app/lib/ai/tool-meta.ts
// Generated: 2026-04-08
// Tool count: 3

/**
 * Auto-generated test fixtures from the canonical tool registry.
 * Import these in tests instead of hardcoding category names, types, etc.
 *
 * Regenerate: tsx scripts/generate-test-fixtures.ts reference-app/lib/ai/tool-meta.ts
 */

export const VALID_CATEGORIES = ["config", "interview", "search"] as const;

export const VALID_TYPES = ["client", "server"] as const;

export const VALID_UI_VALUES = ["custom", "interactive", "silent"] as const;

export const ALL_TOOL_NAMES = ["askQuestion", "searchDocuments", "updateSettings"] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  "config": "Config",
  "interview": "Interview",
  "search": "Search"
};

export const TOOL_COUNT = 3;

// Derived types
export type ToolCategory = typeof VALID_CATEGORIES[number];
export type ToolType = typeof VALID_TYPES[number];
export type ToolUI = typeof VALID_UI_VALUES[number];
export type ToolName = typeof ALL_TOOL_NAMES[number];
