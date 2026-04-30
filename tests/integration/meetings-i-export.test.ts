import { GET } from "@/app/api/meetings/[id]/export/route";
import { describe, expect, it } from "vitest";

describe("meetings-i-export integration companion alias", () => {
  it("points at the meeting export GET handler", () => {
    expect(GET).toBeTypeOf("function");
  });
});
