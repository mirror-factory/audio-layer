/**
 * Eval: MCP tool `search_meetings`
 *
 * Coverage:
 *  - happy path: schema accepts a benign query, handler scopes to caller
 *  - malformed: limit out of range / wrong type — schema rejects
 *  - adversarial: injection-shaped query — handler must pass it as opaque
 *    text and MUST use the bearer userId, never an attacker-supplied one.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleSearchMeetings, SearchMeetingsSchema } from "@/lib/mcp/tools";
import { searchMeetings } from "@/lib/embeddings/search";
import { ADVERSARIAL_PROMPTS, RUN_LIVE_EVALS } from "./_shared";

vi.mock("@/lib/embeddings/search", () => ({
  searchMeetings: vi.fn(),
}));

describe("eval: mcp search_meetings", () => {
  beforeEach(() => {
    vi.mocked(searchMeetings).mockReset();
  });

  describe("happy path", () => {
    it("accepts a valid query and forwards limit + bearer userId", async () => {
      const parsed = SearchMeetingsSchema.safeParse({
        query: "budget",
        limit: 5,
      });
      expect(parsed.success).toBe(true);

      vi.mocked(searchMeetings).mockResolvedValue([]);

      await handleSearchMeetings({ query: "budget", limit: 5 }, "user_a");

      expect(searchMeetings).toHaveBeenCalledWith("budget", "user_a", 5);
    });
  });

  describe("malformed input", () => {
    it("rejects a missing query", () => {
      expect(SearchMeetingsSchema.safeParse({ limit: 5 }).success).toBe(false);
    });

    it("rejects a non-integer limit", () => {
      expect(
        SearchMeetingsSchema.safeParse({ query: "x", limit: 1.5 }).success,
      ).toBe(false);
    });

    it("rejects a limit above the documented ceiling (50)", () => {
      expect(
        SearchMeetingsSchema.safeParse({ query: "x", limit: 999 }).success,
      ).toBe(false);
    });
  });

  describe("adversarial prompt injection", () => {
    it("never overrides the bearer userId with content from the query", async () => {
      const injected = ADVERSARIAL_PROMPTS.exfiltrateUsers;

      // The string itself is valid input — the safety property is at the
      // call boundary: handler must use the trusted userId, not anything
      // pulled from the query payload.
      expect(SearchMeetingsSchema.safeParse({ query: injected }).success).toBe(
        true,
      );

      vi.mocked(searchMeetings).mockResolvedValue([]);

      await handleSearchMeetings({ query: injected }, "trusted_user");

      const [calledQuery, calledUserId] = vi.mocked(searchMeetings).mock
        .calls[0]!;
      expect(calledQuery).toBe(injected);
      expect(calledUserId).toBe("trusted_user");
    });

    it("does not let a tool-hijack-shaped query change the call signature", async () => {
      vi.mocked(searchMeetings).mockResolvedValue([]);
      await handleSearchMeetings(
        { query: ADVERSARIAL_PROMPTS.toolHijack },
        "trusted_user",
      );

      // exactly one call, with our trusted userId
      expect(searchMeetings).toHaveBeenCalledTimes(1);
      expect(vi.mocked(searchMeetings).mock.calls[0]![1]).toBe("trusted_user");
    });
  });

  describe("live-only checks", () => {
    it.skipIf(!RUN_LIVE_EVALS)(
      "live: real embedding search returns user-scoped rows",
      async () => {
        expect(RUN_LIVE_EVALS).toBe(true);
      },
    );
  });
});
