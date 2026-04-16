/**
 * Tool registry sync test — verifies TOOL_META matches actual tool definitions.
 *
 * Ensures:
 * 1. Every key in TOOL_META has a corresponding tool export in tools.ts
 * 2. Every tool in tools.ts has an entry in TOOL_META
 * 3. Every TOOL_META entry has required fields (label, description, type, ui, category)
 * 4. Field values match the canonical set from generated fixtures (no hardcoded arrays)
 * 5. Derived registries are consistent
 */

import { describe, it, expect } from "vitest";
import { TOOL_META } from "@/lib/ai/tool-meta";
import { allTools } from "@/lib/ai/tools";
import {
  TOOL_REGISTRY,
  SILENT_TOOLS,
  CUSTOM_UI_TOOLS,
  INTERACTIVE_TOOLS,
  TOOL_BY_NAME,
} from "@/lib/registry";

// Import from generated fixtures — single source of truth for valid values.
// Regenerate with: tsx scripts/generate-test-fixtures.ts reference-app/lib/ai/tool-meta.ts
import {
  VALID_CATEGORIES,
  VALID_TYPES,
  VALID_UI_VALUES,
  ALL_TOOL_NAMES,
  TOOL_COUNT,
} from "./generated/registry-fixtures";

const metaToolNames = Object.keys(TOOL_META);
const routeToolNames = Object.keys(allTools);

describe("TOOL_META <-> tool definitions sync", () => {
  it("every TOOL_META key exists as a tool in allTools", () => {
    for (const name of metaToolNames) {
      expect(routeToolNames).toContain(name);
    }
  });

  it("every tool in allTools has an entry in TOOL_META", () => {
    for (const name of routeToolNames) {
      expect(metaToolNames).toContain(name);
    }
  });

  it("sets are equal (no orphans in either direction)", () => {
    expect(new Set(metaToolNames)).toEqual(new Set(routeToolNames));
  });

  it("tool count matches generated fixture", () => {
    expect(metaToolNames.length).toBe(TOOL_COUNT);
  });

  it("tool names match generated fixture", () => {
    expect([...metaToolNames].sort()).toEqual([...ALL_TOOL_NAMES]);
  });
});

describe("TOOL_META field completeness", () => {
  it.each(metaToolNames)("%s has all required fields", (name) => {
    const meta = TOOL_META[name];
    expect(meta.label).toBeTruthy();
    expect(meta.description).toBeTruthy();

    // Use generated fixtures instead of hardcoded arrays
    expect([...VALID_TYPES]).toContain(meta.type);
    expect([...VALID_UI_VALUES]).toContain(meta.ui);
    expect([...VALID_CATEGORIES]).toContain(meta.category);
  });
});

describe("Derived registries", () => {
  it("TOOL_REGISTRY has same count as TOOL_META", () => {
    expect(TOOL_REGISTRY.length).toBe(metaToolNames.length);
  });

  it("SILENT_TOOLS contains only tools with ui=silent", () => {
    for (const name of SILENT_TOOLS) {
      expect(TOOL_META[name].ui).toBe("silent");
    }
    // And all silent tools are in the set
    for (const [name, meta] of Object.entries(TOOL_META)) {
      if (meta.ui === "silent") {
        expect(SILENT_TOOLS.has(name)).toBe(true);
      }
    }
  });

  it("CUSTOM_UI_TOOLS contains only tools with ui=custom", () => {
    for (const name of CUSTOM_UI_TOOLS) {
      expect(TOOL_META[name].ui).toBe("custom");
    }
  });

  it("INTERACTIVE_TOOLS contains only tools with ui=interactive", () => {
    for (const name of INTERACTIVE_TOOLS) {
      expect(TOOL_META[name].ui).toBe("interactive");
    }
  });

  it("TOOL_BY_NAME provides O(1) lookup for every tool", () => {
    for (const name of metaToolNames) {
      expect(TOOL_BY_NAME[name]).toBeDefined();
      expect(TOOL_BY_NAME[name].name).toBe(name);
    }
  });

  it("client-side tools in TOOL_META have type=client", () => {
    for (const [name, meta] of Object.entries(TOOL_META)) {
      if (meta.type === "client") {
        expect(meta.ui).toBe("interactive");
      }
    }
  });
});
