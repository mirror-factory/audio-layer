/**
 * meetingToPdfBuffer integration test.
 *
 * Renders a real PDF in-process via @react-pdf/renderer and asserts
 * the byte signature + non-trivial size. Intent: catch a regression
 * where the JSX or styles break PDF generation, without coupling to
 * a specific page count or whitespace.
 */

import { describe, it, expect } from "vitest";
import { meetingToPdfBuffer } from "@/lib/meetings/pdf";
import type { Meeting } from "@/lib/meetings/types";

const meeting: Meeting = {
  id: "tr-pdf-1",
  status: "completed",
  title: "PDF render smoke test",
  text: "joined transcript text",
  utterances: [
    {
      speaker: "A",
      text: "Hello there.",
      start: 0,
      end: 1500,
      confidence: 0.99,
    },
  ],
  durationSeconds: 90,
  summary: {
    title: "PDF render smoke test",
    summary: "A short overview that should appear in the PDF.",
    keyPoints: ["First point", "Second point"],
    actionItems: [
      { assignee: "Alice", task: "Wire the export button", dueDate: null },
    ],
    decisions: [],
    participants: ["Speaker A"],
  },
  intakeForm: {
    intent: "demo recording",
    primaryParticipant: "Alice",
    organization: "Acme",
    contactInfo: { email: "alice@example.com", phone: null },
    budgetMentioned: null,
    timeline: null,
    decisionMakers: [],
    requirements: [],
    painPoints: [],
    nextSteps: [],
  },
  costBreakdown: null,
  error: null,
  createdAt: "2026-04-17T10:00:00.000Z",
  updatedAt: "2026-04-17T10:00:00.000Z",
};

describe("meetingToPdfBuffer", () => {
  it(
    "produces a valid PDF buffer with the %PDF- header",
    async () => {
      const buf = await meetingToPdfBuffer(meeting);
      expect(buf.byteLength).toBeGreaterThan(1000);
      const head = buf.subarray(0, 5).toString("ascii");
      expect(head).toBe("%PDF-");
    },
    20_000,
  );
});
