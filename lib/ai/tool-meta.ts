/**
 * Tool metadata registry — single source of truth for all AI tools.
 *
 * Every tool the chat agent can call has an entry here.
 * Derived registries, tests, and documentation consume this object.
 */

export interface ToolMeta {
  label: string;
  description: string;
  type: "server" | "client";
  ui: "custom" | "interactive" | "silent";
  category: string;
}

export const TOOL_META: Record<string, ToolMeta> = {
  searchDocuments: {
    label: "Search",
    description: "Search documents by query",
    type: "server",
    ui: "custom",
    category: "search",
  },
  askQuestion: {
    label: "Question",
    description: "Ask user a multiple-choice question",
    type: "client",
    ui: "interactive",
    category: "interview",
  },
  updateSettings: {
    label: "Settings",
    description: "Update a configuration setting",
    type: "server",
    ui: "silent",
    category: "config",
  },
} as const;
