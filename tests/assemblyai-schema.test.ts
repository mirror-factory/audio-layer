import { describe, it, expect } from "vitest";
import {
  MeetingSummarySchema,
  ActionItemSchema,
} from "@/lib/assemblyai/schema";

describe("MeetingSummarySchema", () => {
  const validData = {
    title: "Quarterly Planning Review",
    summary:
      "The team discussed Q2 goals and resource allocation. Key decisions were made about hiring priorities.",
    keyPoints: [
      "Q2 revenue target set at $2M",
      "Engineering hiring two senior roles",
      "Marketing budget increased 15%",
    ],
    actionItems: [
      {
        assignee: "Alice",
        task: "Draft the hiring plan",
        dueDate: "2026-05-01",
      },
      {
        assignee: null,
        task: "Review budget spreadsheet",
        dueDate: null,
      },
    ],
    decisions: ["Approved Q2 budget", "Delayed the office move to Q3"],
    participants: ["Alice", "Bob", "Speaker C"],
  };

  it("parses valid data", () => {
    const result = MeetingSummarySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Quarterly Planning Review");
      expect(result.data.keyPoints).toHaveLength(3);
      expect(result.data.actionItems).toHaveLength(2);
      expect(result.data.decisions).toHaveLength(2);
      expect(result.data.participants).toHaveLength(3);
    }
  });

  it("rejects data missing required fields", () => {
    const incomplete = { title: "Hello" };
    const result = MeetingSummarySchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it("rejects data with wrong types", () => {
    const wrongTypes = {
      ...validData,
      title: 123,
    };
    const result = MeetingSummarySchema.safeParse(wrongTypes);
    expect(result.success).toBe(false);
  });

  it("rejects when keyPoints is not an array", () => {
    const result = MeetingSummarySchema.safeParse({
      ...validData,
      keyPoints: "not an array",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty arrays for optional list fields", () => {
    const minimal = {
      ...validData,
      keyPoints: [],
      actionItems: [],
      decisions: [],
      participants: [],
    };
    const result = MeetingSummarySchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});

describe("ActionItemSchema", () => {
  it("parses a complete action item", () => {
    const result = ActionItemSchema.safeParse({
      assignee: "Alice",
      task: "Write the report",
      dueDate: "2026-05-15",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assignee).toBe("Alice");
      expect(result.data.task).toBe("Write the report");
      expect(result.data.dueDate).toBe("2026-05-15");
    }
  });

  it("handles nullable assignee", () => {
    const result = ActionItemSchema.safeParse({
      assignee: null,
      task: "General cleanup",
      dueDate: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assignee).toBeNull();
    }
  });

  it("handles nullable dueDate", () => {
    const result = ActionItemSchema.safeParse({
      assignee: "Bob",
      task: "Fix the bug",
      dueDate: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dueDate).toBeNull();
    }
  });

  it("rejects missing task field", () => {
    const result = ActionItemSchema.safeParse({
      assignee: "Alice",
      dueDate: null,
    });
    expect(result.success).toBe(false);
  });
});
