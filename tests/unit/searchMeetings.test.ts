import { describe, expect, it } from "vitest";

import { TOOL_METADATA_MAP } from "@/lib/ai/tools/_metadata";

describe("searchMeetings tool registry contract", () => {
  it("is registered as a passing read-only search tool", () => {
    expect(TOOL_METADATA_MAP.searchMeetings).toMatchObject({
      access: "read",
      category: "search",
      service: "supabase",
      testStatus: "passing",
    });
  });
});
