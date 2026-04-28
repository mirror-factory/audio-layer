import { describe, expect, it } from "vitest";

import { TOOL_METADATA_MAP } from "@/lib/ai/tools/_metadata";

describe("listRecentMeetings tool registry contract", () => {
  it("is registered as a passing read-only knowledge tool", () => {
    expect(TOOL_METADATA_MAP.listRecentMeetings).toMatchObject({
      access: "read",
      category: "knowledge",
      service: "supabase",
      testStatus: "passing",
    });
  });
});
