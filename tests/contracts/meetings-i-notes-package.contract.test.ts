import { apiRouteContracts } from "@/tests/api/route-contracts";
import { describe, expect, it } from "vitest";

describe("meetings-i-notes-package contract companion alias", () => {
  it("keeps the meeting notes-package route registered", () => {
    expect(
      apiRouteContracts.some(
        (contract) =>
          contract.file === "app/api/meetings/[id]/notes-package/route.ts",
      ),
    ).toBe(true);
  });
});
