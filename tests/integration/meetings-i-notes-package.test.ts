import { POST } from "@/app/api/meetings/[id]/notes-package/route";
import { describe, expect, it } from "vitest";

describe("meetings-i-notes-package integration companion alias", () => {
  it("points at the meeting notes-package POST handler", () => {
    expect(POST).toBeTypeOf("function");
  });
});
