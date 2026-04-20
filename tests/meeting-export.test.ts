import { describe, it, expect } from "vitest";
import {
  meetingToMarkdown,
  meetingFilenameStem,
} from "@/lib/meetings/export";
import type { Meeting } from "@/lib/meetings/types";

function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: "m-1",
    status: "completed",
    title: "Quarterly Planning Review",
    text: null,
    utterances: [],
    durationSeconds: 3600,
    summary: {
      title: "Quarterly Planning Review",
      summary: "The team discussed Q2 goals and resource allocation.",
      keyPoints: [
        "Q2 revenue target set at $2M",
        "Engineering hiring two senior roles",
      ],
      actionItems: [
        { assignee: "Alice", task: "Draft hiring plan", dueDate: "2026-05-01" },
        { assignee: null, task: "Review budget", dueDate: null },
      ],
      decisions: ["Approved Q2 budget"],
      participants: ["Alice", "Bob"],
    },
    intakeForm: null,
    costBreakdown: null,
    error: null,
    createdAt: "2026-04-19T10:00:00.000Z",
    updatedAt: "2026-04-19T10:30:00.000Z",
    ...overrides,
  };
}

describe("meetingToMarkdown", () => {
  it("includes title", () => {
    const md = meetingToMarkdown(makeMeeting());
    expect(md).toContain("# Quarterly Planning Review");
  });

  it("uses 'Untitled Recording' when title is null", () => {
    const md = meetingToMarkdown(makeMeeting({ title: null }));
    expect(md).toContain("# Untitled Recording");
  });

  it("includes summary text", () => {
    const md = meetingToMarkdown(makeMeeting());
    expect(md).toContain("## Summary");
    expect(md).toContain(
      "The team discussed Q2 goals and resource allocation.",
    );
  });

  it("includes key points", () => {
    const md = meetingToMarkdown(makeMeeting());
    expect(md).toContain("## Key Points");
    expect(md).toContain("- Q2 revenue target set at $2M");
    expect(md).toContain("- Engineering hiring two senior roles");
  });

  it("includes action items with assignee and due date", () => {
    const md = meetingToMarkdown(makeMeeting());
    expect(md).toContain("## Action Items");
    expect(md).toContain("- [ ] Draft hiring plan (Alice) -- due 2026-05-01");
    expect(md).toContain("- [ ] Review budget");
  });

  it("includes decisions", () => {
    const md = meetingToMarkdown(makeMeeting());
    expect(md).toContain("## Decisions");
    expect(md).toContain("- Approved Q2 budget");
  });

  it("includes participants", () => {
    const md = meetingToMarkdown(makeMeeting());
    expect(md).toContain("**Participants:** Alice, Bob");
  });

  it("includes duration in minutes", () => {
    const md = meetingToMarkdown(makeMeeting({ durationSeconds: 1800 }));
    expect(md).toContain("**Duration:** 30 minutes");
  });

  it("omits summary section when summary is null", () => {
    const md = meetingToMarkdown(makeMeeting({ summary: null }));
    expect(md).not.toContain("## Summary");
    expect(md).not.toContain("## Key Points");
  });

  it("includes transcript from utterances", () => {
    const md = meetingToMarkdown(
      makeMeeting({
        summary: null,
        utterances: [
          { speaker: "Alice", text: "Hello everyone" },
          { speaker: "Bob", text: "Hi Alice" },
        ],
      }),
    );
    expect(md).toContain("## Transcript");
    expect(md).toContain("**Alice:** Hello everyone");
    expect(md).toContain("**Bob:** Hi Alice");
  });

  it("includes transcript from text when no utterances", () => {
    const md = meetingToMarkdown(
      makeMeeting({
        summary: null,
        utterances: [],
        text: "Raw transcript text here",
      }),
    );
    expect(md).toContain("## Transcript");
    expect(md).toContain("Raw transcript text here");
  });
});

describe("meetingFilenameStem", () => {
  it("generates date-slug format", () => {
    const stem = meetingFilenameStem(makeMeeting());
    expect(stem).toBe("2026-04-19-quarterly-planning-review");
  });

  it("uses 'untitled' when title is null", () => {
    const stem = meetingFilenameStem(makeMeeting({ title: null }));
    expect(stem).toBe("2026-04-19-untitled");
  });

  it("sanitizes special characters", () => {
    const stem = meetingFilenameStem(
      makeMeeting({ title: "Hello, World! #1 @test" }),
    );
    expect(stem).toBe("2026-04-19-hello-world-1-test");
  });

  it("truncates long titles to 50 chars in slug portion", () => {
    const longTitle =
      "This is a very long meeting title that should be truncated to fit within the filename limit";
    const stem = meetingFilenameStem(makeMeeting({ title: longTitle }));
    // date prefix is "2026-04-19-", slug is max 50 chars
    const slugPart = stem.replace("2026-04-19-", "");
    expect(slugPart.length).toBeLessThanOrEqual(50);
  });

  it("removes leading and trailing hyphens from slug", () => {
    const stem = meetingFilenameStem(makeMeeting({ title: "---hello---" }));
    expect(stem).toBe("2026-04-19-hello");
  });
});
