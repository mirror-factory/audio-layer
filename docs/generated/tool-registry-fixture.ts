// DO NOT EDIT — generated from tool-meta.ts by generate-from-registry.ts

/**
 * Auto-generated test fixture from tool registry.
 * Import these constants in your tests instead of hardcoding values.
 */

export const VALID_CATEGORIES = ["config","interview","search"] as const;

export const VALID_TYPES = ["client","server"] as const;

export const VALID_UI_VALUES = ["custom","interactive","silent"] as const;

export const VALID_SERVICES = [] as const;

export const ALL_TOOL_NAMES = ["askQuestion","searchDocuments","updateSettings"] as const;

export const TOOL_COUNT = 3;

export type ToolCategory = typeof VALID_CATEGORIES[number];

export type ToolName = typeof ALL_TOOL_NAMES[number];
