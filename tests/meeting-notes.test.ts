import { describe, expect, it } from "vitest";
import {
  buildMeetingIntakeSignals,
  formatMeetingActionItem,
} from "@/lib/meeting-notes";
import type { IntakeForm } from "@/lib/assemblyai/intake";

describe("meeting notes helpers", () => {
  it("formats action items with owner and due date for the notes panel", () => {
    expect(
      formatMeetingActionItem({
        assignee: "Avery",
        task: "Send the revised implementation plan",
        dueDate: "2026-04-30",
      }),
    ).toBe("Avery: Send the revised implementation plan (due 2026-04-30)");
  });

  it("builds intake signals in the note-first detail order", () => {
    const intakeForm: IntakeForm = {
      intent: "sales discovery call",
      primaryParticipant: "Jordan",
      organization: "Northstar",
      contactInfo: { email: null, phone: null },
      budgetMentioned: "$25k pilot",
      timeline: "May launch",
      decisionMakers: ["Finance lead"],
      requirements: ["CRM sync"],
      painPoints: ["Manual meeting notes"],
      nextSteps: ["Schedule pilot kickoff"],
    };

    expect(buildMeetingIntakeSignals(intakeForm)).toEqual([
      "Budget: $25k pilot",
      "Timeline: May launch",
      "Decision maker: Finance lead",
      "Pain: Manual meeting notes",
      "Need: CRM sync",
    ]);
  });
});
