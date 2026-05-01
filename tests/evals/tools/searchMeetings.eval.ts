/**
 * Eval: AI SDK tool `searchMeetings`
 *
 * Coverage:
 *  - happy path: valid input → schema accepts → execute scopes search to user
 *  - malformed: limit out of range → schema rejects
 *  - adversarial: prompt-injection-style query — must be passed as opaque
 *    text to the embedding search layer (no instruction interpretation,
 *    no privilege escalation, never crosses the user_id boundary).
 *
 * Cheap deterministic checks run by default (`pnpm test:tools:eval`).
 * Live LLM judge / embeddings calls would require RUN_LIVE_EVALS=1.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { allTools } from "@/lib/ai/tools";
import { searchMeetings } from "@/lib/embeddings/search";
import { getCurrentUserId } from "@/lib/supabase/user";
import {
  ADVERSARIAL_PROMPTS,
  RUN_LIVE_EVALS,
  TOOL_OPTIONS,
  asExecutable,
} from "./_shared";

vi.mock("@/lib/embeddings/search", () => ({
  searchMeetings: vi.fn(),
}));

vi.mock("@/lib/supabase/user", () => ({
  getCurrentUserId: vi.fn(),
}));

interface SearchInput {
  query: string;
  limit?: number;
}
interface SearchOutput {
  results?: Array<{ meetingId: string; relevance: number; excerpt: string }>;
  error?: string;
  message?: string;
}

const tool = asExecutable<SearchInput, SearchOutput>(allTools.searchMeetings);

describe("eval: searchMeetings (AI SDK tool)", () => {
  beforeEach(() => {
    vi.mocked(searchMeetings).mockReset();
    vi.mocked(getCurrentUserId).mockReset();
  });

  describe("happy path", () => {
    it("accepts a valid query+limit and returns mapped results scoped to the user", async () => {
      expect(
        tool.inputSchema.safeParse({ query: "pricing", limit: 5 }).success,
      ).toBe(true);

      vi.mocked(getCurrentUserId).mockResolvedValue("user_a");
      vi.mocked(searchMeetings).mockResolvedValue([
        {
          meetingId: "m_1",
          meetingTitle: "Pricing call",
          meetingDate: "2026-04-24T00:00:00.000Z",
          chunkText: "We agreed on a $79/mo team plan.",
          chunkType: "transcript",
          similarity: 0.91,
        },
      ]);

      const result = await tool.execute(
        { query: "pricing decisions", limit: 3 },
        TOOL_OPTIONS,
      );

      expect(searchMeetings).toHaveBeenCalledWith("pricing decisions", "user_a", 3);
      expect(result.results?.[0]).toMatchObject({
        meetingId: "m_1",
        relevance: 91,
      });
    });
  });

  describe("malformed input", () => {
    it("rejects a missing query", () => {
      const parsed = tool.inputSchema.safeParse({ limit: 5 });
      expect(parsed.success).toBe(false);
    });

    it("rejects a limit above the documented ceiling", () => {
      const parsed = tool.inputSchema.safeParse({ query: "x", limit: 99 });
      expect(parsed.success).toBe(false);
    });

    it("rejects a non-string query (number coerced injection)", () => {
      const parsed = tool.inputSchema.safeParse({ query: 42 });
      expect(parsed.success).toBe(false);
    });
  });

  describe("adversarial prompt injection", () => {
    it("treats an instruction-shaped query as opaque text and still scopes to the caller", async () => {
      const injected = ADVERSARIAL_PROMPTS.ignoreInstructions;

      // Schema accepts (it's a valid string) — but the tool MUST NOT change
      // its user_id argument or skip the auth check based on the payload.
      expect(tool.inputSchema.safeParse({ query: injected }).success).toBe(true);

      vi.mocked(getCurrentUserId).mockResolvedValue("user_a");
      vi.mocked(searchMeetings).mockResolvedValue([]);

      await tool.execute({ query: injected }, TOOL_OPTIONS);

      // Critical invariant: user_id is the authenticated caller, NEVER
      // overridden by the prompt content.
      expect(searchMeetings).toHaveBeenCalledTimes(1);
      const [calledQuery, calledUserId] = vi.mocked(searchMeetings).mock.calls[0]!;
      expect(calledQuery).toBe(injected); // passed as data
      expect(calledUserId).toBe("user_a"); // not influenced by the prompt
    });

    it("returns the auth error path even when the query embeds an admin hint", async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(null);

      const result = await tool.execute(
        { query: ADVERSARIAL_PROMPTS.exfiltrateUsers },
        TOOL_OPTIONS,
      );

      expect(result).toEqual({ results: [], error: "Not authenticated" });
      expect(searchMeetings).not.toHaveBeenCalled();
    });
  });

  describe("live-only checks", () => {
    it.skipIf(!RUN_LIVE_EVALS)(
      "live: real embedding search responds within budget for a benign query",
      async () => {
        // Placeholder for live embedding eval. Gated behind RUN_LIVE_EVALS=1
        // so CI's deterministic subset never hits the embeddings provider.
        expect(RUN_LIVE_EVALS).toBe(true);
      },
    );
  });
});
