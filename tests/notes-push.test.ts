import { describe, expect, it } from "vitest";
import {
  buildMissingNotesPushPackage,
  buildNotesPushPackage,
} from "@/lib/notes-push";
import type { Meeting } from "@/lib/meetings/types";

const meeting: Meeting = {
  id: "meeting_1",
  title: "Launch review",
  status: "completed",
  text: "Speaker A: We should launch next week.",
  utterances: [],
  durationSeconds: 1200,
  summary: {
    title: "Launch review",
    summary: "The team reviewed launch readiness and owner follow-up.",
    keyPoints: ["Pricing is approved"],
    actionItems: [
      {
        assignee: "Alex",
        task: "Send launch timeline",
        dueDate: "2026-04-30",
      },
    ],
    decisions: ["Launch remains on track"],
    participants: ["Alex"],
  },
  intakeForm: {
    intent: "sales discovery call",
    primaryParticipant: "Jordan",
    organization: "Acme",
    contactInfo: { email: null, phone: null },
    budgetMentioned: "$10k",
    timeline: "next week",
    decisionMakers: ["Jordan"],
    requirements: ["Needs Slack handoff"],
    painPoints: ["Manual follow-up"],
    nextSteps: ["Send recap"],
  },
  costBreakdown: null,
  error: null,
  createdAt: "2026-04-24T00:00:00.000Z",
  updatedAt: "2026-04-24T00:00:00.000Z",
};

describe("notes push package builder", () => {
  it("builds a compact destination-labeled notes package", () => {
    const payload = buildNotesPushPackage(meeting, {
      destination: "agent_clipboard",
      trigger: "manual_push",
      include_transcript: false,
    });

    expect(payload).toMatchObject({
      ready: true,
      meetingId: "meeting_1",
      title: "Launch review",
      destination: "agent_clipboard",
      actionItemCount: 1,
      decisionCount: 1,
    });
    expect(payload.markdown).toContain("# Launch review");
    expect(payload.markdown).toContain("## Decisions");
    expect(payload.markdown).toContain("- Launch remains on track");
    expect(payload.markdown).toContain(
      "- Alex: Send launch timeline (due 2026-04-30)",
    );
    expect(payload.markdown).toContain("- Intent: sales discovery call");
    expect(payload.markdown).not.toContain("## Transcript");
    expect(payload.payload.transcript).toBeUndefined();
  });

  it("includes transcript text only when explicitly requested", () => {
    const payload = buildNotesPushPackage(meeting, {
      destination: "agent_clipboard",
      trigger: "manual_push",
      include_transcript: true,
    });

    expect(payload.markdown).toContain("## Transcript");
    expect(payload.markdown).toContain("Speaker A: We should launch next week.");
    expect(payload.payload.transcript).toBe(
      "Speaker A: We should launch next week.",
    );
  });

  it("returns a non-transmitting missing-meeting payload for MCP clients", () => {
    expect(
      buildMissingNotesPushPackage({
        meeting_id: "missing",
        destination: "mcp_client",
        trigger: "manual_push",
        include_transcript: false,
      }),
    ).toMatchObject({
      ready: false,
      meetingId: "missing",
      destination: "mcp_client",
      error: "Meeting not found",
    });
  });
});
