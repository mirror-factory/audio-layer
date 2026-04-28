import { describe, expect, it } from "vitest";

import { TOOL_METADATA_MAP } from "@/lib/ai/tools/_metadata";

describe("codeReview tool registry contract", () => {
  it("is registered as a passing read-only local code tool", () => {
    expect(TOOL_METADATA_MAP.codeReview).toMatchObject({
      access: "read",
      category: "code",
      service: "local",
      testStatus: "passing",
    });
  });
});
