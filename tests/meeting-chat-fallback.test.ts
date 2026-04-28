import { describe, expect, it } from "vitest";
import {
  buildLocalMeetingAnswer,
  extractLastUserText,
} from "@/lib/meeting-chat-fallback";
import type { Meeting } from "@/lib/meetings/types";

const meeting: Meeting = {
  id: "meeting_1",
  status: "completed",
  title: "Product Discovery",
  text: "The customer needs faster reporting and has budget approval.",
  utterances: [
    {
      speaker: "Customer",
      text: "We need faster reporting before the June launch.",
      start: 0,
      end: 2000,
      confidence: 0.95,
    },
    {
      speaker: "Alex",
      text: "I will send the proposal and pricing options tomorrow.",
      start: 2000,
      end: 4000,
      confidence: 0.94,
    },
  ],
  durationSeconds: 900,
  summary: {
    title: "Product Discovery",
    summary: "The customer discussed reporting needs, timeline, and budget.",
    keyPoints: ["Reporting is too slow", "June launch is the deadline"],
    actionItems: [
      { assignee: "Alex", task: "Send proposal and pricing options", dueDate: null },
    ],
    decisions: ["Move forward with a proposal"],
    participants: ["Customer", "Alex"],
  },
  intakeForm: {
    intent: "sales discovery call",
    primaryParticipant: "Customer",
    organization: "Acme",
    contactInfo: { email: null, phone: null },
    budgetMentioned: "Budget approval exists",
    timeline: "Before the June launch",
    decisionMakers: ["Customer"],
    requirements: ["Faster reporting"],
    painPoints: ["Reporting is too slow"],
    nextSteps: ["Send proposal and pricing options"],
  },
  costBreakdown: null,
  error: null,
  createdAt: "2026-04-24T00:00:00.000Z",
  updatedAt: "2026-04-24T00:00:00.000Z",
};

describe("meeting chat local fallback", () => {
  it("extracts the last user text from AI SDK UI messages", () => {
    expect(extractLastUserText([
      { role: "user", parts: [{ type: "text", text: "First question" }] },
      { role: "assistant", parts: [{ type: "text", text: "Answer" }] },
      { role: "user", parts: [{ type: "text", text: "Latest question" }] },
    ])).toBe("Latest question");
  });

  it("builds a sales brief from saved summary, intake, actions, and transcript", () => {
    const answer = buildLocalMeetingAnswer(meeting, "Create a sales discovery brief");

    expect(answer).toContain("Sales Discovery Brief");
    expect(answer).toContain("Budget approval exists");
    expect(answer).toContain("Faster reporting");
    expect(answer).toContain("Send proposal and pricing options");
    expect(answer).toContain("[S");
  });

  it("answers action-item questions without calling a model", () => {
    const answer = buildLocalMeetingAnswer(meeting, "What are the action items?");

    expect(answer).toContain("Action Items");
    expect(answer).toContain("Alex: Send proposal and pricing options");
    expect(answer).toContain("Local answer from saved notes and transcript.");
  });
});
