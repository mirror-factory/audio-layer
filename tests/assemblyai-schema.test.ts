/**
 * Schema tests for the structured meeting summary produced by the Gateway.
 * These guard the Client<->Server contract: /record expects these fields
 * in this shape, and the LLM must be constrained to produce them.
 */

import { describe, it, expect } from "vitest";
import {
  ActionItemSchema,
  MeetingSummarySchema,
} from "@/lib/assemblyai/schema";

describe("MeetingSummarySchema", () => {
  it("accepts a fully populated, realistic summary", () => {
    const sample = {
      title: "Q2 audio-layer kickoff",
      summary:
        "Kickoff call for the Q2 audio-layer launch. Team aligned on scope and owners.",
      keyPoints: [
        "Target launch end of May",
        "Streaming comes after batch pipeline lands",
        "Pricing locked at Core $15 / Pro $25",
      ],
      actionItems: [
        {
          assignee: "Speaker A",
          task: "Publish the transcription API route",
          dueDate: "2026-04-25",
        },
        {
          assignee: null,
          task: "Draft the pricing page copy",
          dueDate: null,
        },
      ],
      decisions: [
        "AssemblyAI Universal-3 Pro is the default transcription engine",
      ],
      participants: ["Speaker A", "Speaker B"],
    };

    const parsed = MeetingSummarySchema.parse(sample);
    expect(parsed.summary).toContain("Q2");
    expect(parsed.keyPoints).toHaveLength(3);
    expect(parsed.actionItems[0]?.assignee).toBe("Speaker A");
    expect(parsed.actionItems[1]?.dueDate).toBeNull();
  });

  it("accepts empty arrays on optional sections", () => {
    const empty = {
      title: "Silent recording",
      summary: "Silent recording — no speech.",
      keyPoints: [],
      actionItems: [],
      decisions: [],
      participants: [],
    };
    expect(() => MeetingSummarySchema.parse(empty)).not.toThrow();
  });

  it("rejects missing required fields", () => {
    const bad = { summary: "hi" };
    expect(() => MeetingSummarySchema.parse(bad)).toThrow();
  });

  it("rejects missing title", () => {
    const bad = {
      summary: "ok",
      keyPoints: [],
      actionItems: [],
      decisions: [],
      participants: [],
    };
    expect(() => MeetingSummarySchema.parse(bad)).toThrow();
  });

  it("rejects wrong types for keyPoints", () => {
    const bad = {
      title: "ok",
      summary: "ok",
      keyPoints: "not an array",
      actionItems: [],
      decisions: [],
      participants: [],
    };
    expect(() => MeetingSummarySchema.parse(bad)).toThrow();
  });

  it("action item assignee and dueDate can be null but not undefined", () => {
    const good = { assignee: null, task: "do thing", dueDate: null };
    expect(() => ActionItemSchema.parse(good)).not.toThrow();

    const bad = { task: "do thing" };
    expect(() => ActionItemSchema.parse(bad)).toThrow();
  });
});
