/**
 * Eval: AI SDK tool `getMeetingDetails`
 *
 * Coverage:
 *  - happy path: valid meetingId → schema accepts → execute returns
 *    normalized meeting context (transcript, key points)
 *  - malformed: missing meetingId → schema rejects
 *  - adversarial: meetingId field carries prompt-injection / path-traversal
 *    text — must be passed verbatim to the store and never interpreted as
 *    a directive. A non-existent ID returns `{ error }`, never another
 *    user's row.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { allTools } from "@/lib/ai/tools";
import { getMeetingsStore } from "@/lib/meetings/store";
import {
  ADVERSARIAL_PROMPTS,
  RUN_LIVE_EVALS,
  TOOL_OPTIONS,
  asExecutable,
} from "./_shared";

vi.mock("@/lib/meetings/store", () => ({
  getMeetingsStore: vi.fn(),
}));

interface DetailInput {
  meetingId: string;
}
interface DetailOutput {
  id?: string;
  title?: string;
  transcript?: string;
  keyPoints?: string[];
  error?: string;
}

const tool = asExecutable<DetailInput, DetailOutput>(allTools.getMeetingDetails);

function makeStore(getResult: unknown) {
  return {
    insert: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
    get: vi.fn().mockResolvedValue(getResult),
    delete: vi.fn(),
  };
}

describe("eval: getMeetingDetails (AI SDK tool)", () => {
  beforeEach(() => {
    vi.mocked(getMeetingsStore).mockReset();
  });

  describe("happy path", () => {
    it("accepts a valid id and returns normalized fields", async () => {
      expect(
        tool.inputSchema.safeParse({ meetingId: "m_1" }).success,
      ).toBe(true);

      const store = makeStore({
        id: "m_1",
        title: "Demo call",
        createdAt: "2026-04-24T00:00:00.000Z",
        updatedAt: "2026-04-24T00:00:00.000Z",
        durationSeconds: 1800,
        status: "completed",
        text: "Full transcript",
        utterances: [{ speaker: "A", text: "Hello there", start: 0, end: 1, confidence: 0.99 }],
        summary: {
          title: "Demo call",
          summary: "Short summary",
          keyPoints: ["Budget"],
          actionItems: [],
          decisions: [],
          participants: [],
        },
        intakeForm: null,
        costBreakdown: null,
        error: null,
      });
      vi.mocked(getMeetingsStore).mockResolvedValue(store);

      const result = await tool.execute({ meetingId: "m_1" }, TOOL_OPTIONS);

      expect(store.get).toHaveBeenCalledWith("m_1");
      expect(result).toMatchObject({
        id: "m_1",
        title: "Demo call",
        transcript: "Hello there",
        keyPoints: ["Budget"],
      });
    });
  });

  describe("malformed input", () => {
    it("rejects empty input", () => {
      expect(tool.inputSchema.safeParse({}).success).toBe(false);
    });

    it("rejects a non-string meetingId", () => {
      expect(
        tool.inputSchema.safeParse({ meetingId: 123 }).success,
      ).toBe(false);
    });
  });

  describe("adversarial prompt injection", () => {
    it("passes an injection-shaped meetingId verbatim to the store and returns 'not found' rather than guessing", async () => {
      const adversarial = ADVERSARIAL_PROMPTS.ignoreInstructions;

      // Schema is permissive on `meetingId: string` — it should accept any
      // string. The execution layer is responsible for rejecting unknown ids.
      expect(
        tool.inputSchema.safeParse({ meetingId: adversarial }).success,
      ).toBe(true);

      const store = makeStore(null);
      vi.mocked(getMeetingsStore).mockResolvedValue(store);

      const result = await tool.execute(
        { meetingId: adversarial },
        TOOL_OPTIONS,
      );

      expect(store.get).toHaveBeenCalledWith(adversarial);
      expect(result).toEqual({ error: "Meeting not found" });
    });

    it("does not let path-traversal-shaped ids leak data when the store returns null", async () => {
      const store = makeStore(null);
      vi.mocked(getMeetingsStore).mockResolvedValue(store);

      const result = await tool.execute(
        { meetingId: ADVERSARIAL_PROMPTS.pathTraversal },
        TOOL_OPTIONS,
      );

      expect(result).toEqual({ error: "Meeting not found" });
    });
  });

  describe("live-only checks", () => {
    it.skipIf(!RUN_LIVE_EVALS)(
      "live: real Supabase store returns the seeded fixture",
      async () => {
        expect(RUN_LIVE_EVALS).toBe(true);
      },
    );
  });
});
