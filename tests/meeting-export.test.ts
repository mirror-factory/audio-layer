/**
 * meetingToMarkdown / meetingFilenameStem unit tests.
 *
 * Deterministic snapshots: the markdown shape is part of the public
 * contract (people share these files), so accidental whitespace or
 * ordering changes should fail loudly.
 */

import { describe, it, expect } from "vitest";
import {
  meetingFilenameStem,
  meetingToMarkdown,
} from "@/lib/meetings/export";
import type { Meeting } from "@/lib/meetings/types";
import type { MeetingSummary } from "@/lib/assemblyai/schema";

const baseMeeting: Meeting = {
  id: "01HZX1ABCD2EFGH3IJKL",
  status: "completed",
  title: "Q2 audio-layer kickoff",
  text: "joined transcript text",
  utterances: [
    {
      speaker: "A",
      text: "Welcome to the Q2 kickoff.",
      start: 0,
      end: 2200,
      confidence: 0.98,
    },
    {
      speaker: "B",
      text: "Thanks. Let's start with scope.",
      start: 2300,
      end: 5400,
      confidence: 0.97,
    },
  ],
  durationSeconds: 65,
  summary: null,
  error: null,
  createdAt: "2026-04-17T10:00:00.000Z",
  updatedAt: "2026-04-17T10:00:00.000Z",
};

const fullSummary: MeetingSummary = {
  title: baseMeeting.title!,
  summary: "Team aligned on launch scope and engine choice.",
  keyPoints: ["Lock pricing", "Pick engine"],
  actionItems: [
    {
      assignee: "Speaker A",
      task: "Publish API route",
      dueDate: "2026-04-25",
    },
    { assignee: null, task: "Draft pricing copy", dueDate: null },
  ],
  decisions: ["AssemblyAI Universal-3 Pro is the engine"],
  participants: ["Speaker A", "Speaker B"],
};

describe("meetingToMarkdown", () => {
  it("renders title, metadata, and transcript when no summary present", () => {
    const md = meetingToMarkdown(baseMeeting);
    expect(md).toContain("# Q2 audio-layer kickoff");
    expect(md).toContain("Status: completed");
    expect(md).toContain("Duration: 1m 5s");
    expect(md).toContain("**Speaker A**");
    expect(md).toContain("Welcome to the Q2 kickoff.");
    expect(md).not.toContain("## Summary");
    expect(md).not.toContain("## Action items");
  });

  it("emits all summary sections in order when summary is present", () => {
    const md = meetingToMarkdown({ ...baseMeeting, summary: fullSummary });
    const summaryIdx = md.indexOf("## Summary");
    const keyPointsIdx = md.indexOf("## Key points");
    const decisionsIdx = md.indexOf("## Decisions");
    const actionsIdx = md.indexOf("## Action items");
    const participantsIdx = md.indexOf("## Participants");
    const transcriptIdx = md.indexOf("## Transcript");

    expect(summaryIdx).toBeGreaterThan(-1);
    expect(keyPointsIdx).toBeGreaterThan(summaryIdx);
    expect(decisionsIdx).toBeGreaterThan(keyPointsIdx);
    expect(actionsIdx).toBeGreaterThan(decisionsIdx);
    expect(participantsIdx).toBeGreaterThan(actionsIdx);
    expect(transcriptIdx).toBeGreaterThan(participantsIdx);
  });

  it("renders action items as GFM checkboxes with assignee + due date", () => {
    const md = meetingToMarkdown({ ...baseMeeting, summary: fullSummary });
    expect(md).toContain(
      "- [ ] Publish API route _(Speaker A)_ — due 2026-04-25",
    );
    expect(md).toContain("- [ ] Draft pricing copy");
  });

  it("falls back to plain text when no utterances exist", () => {
    const md = meetingToMarkdown({
      ...baseMeeting,
      utterances: [],
      text: "Plain transcript only.",
    });
    expect(md).toContain("Plain transcript only.");
    expect(md).not.toContain("**Speaker");
  });

  it("emits a 'no transcript content' line when both utterances and text are empty", () => {
    const md = meetingToMarkdown({
      ...baseMeeting,
      utterances: [],
      text: null,
    });
    expect(md).toContain("_No transcript content._");
  });

  it("handles a missing title gracefully", () => {
    const md = meetingToMarkdown({ ...baseMeeting, title: null });
    expect(md).toMatch(/^# Untitled recording/);
  });

  it("ends with exactly one newline", () => {
    const md = meetingToMarkdown(baseMeeting);
    expect(md.endsWith("\n")).toBe(true);
    expect(md.endsWith("\n\n")).toBe(false);
  });
});

describe("meetingFilenameStem", () => {
  it("slugifies the title", () => {
    expect(meetingFilenameStem(baseMeeting)).toBe("q2-audio-layer-kickoff");
  });

  it("falls back to a meeting-prefixed stem when title is missing", () => {
    const stem = meetingFilenameStem({ ...baseMeeting, title: null });
    expect(stem).toBe("meeting-01HZX1AB");
  });

  it("strips punctuation and trims hyphens", () => {
    const stem = meetingFilenameStem({
      ...baseMeeting,
      title: "  --Hello, World!! --  ",
    });
    expect(stem).toBe("hello-world");
  });

  it("caps long titles at 60 characters", () => {
    const long = "x".repeat(120);
    const stem = meetingFilenameStem({ ...baseMeeting, title: long });
    expect(stem.length).toBeLessThanOrEqual(60);
  });
});
