import { apiRouteContracts } from "@/tests/api/route-contracts";
import { describe, expect, it } from "vitest";

describe("meetings-i-export contract companion alias", () => {
  it("keeps the meeting export route registered", () => {
    expect(
      apiRouteContracts.some(
        (contract) => contract.file === "app/api/meetings/[id]/export/route.ts",
      ),
    ).toBe(true);
  });
});
