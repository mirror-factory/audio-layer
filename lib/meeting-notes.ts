import type { MeetingSummary } from "@/lib/assemblyai/schema";
import type { IntakeForm } from "@/lib/assemblyai/intake";

export function formatMeetingActionItem(
  item: MeetingSummary["actionItems"][number],
): string {
  const owner = item.assignee ? `${item.assignee}: ` : "";
  const due = item.dueDate ? ` (due ${item.dueDate})` : "";
  return `${owner}${item.task}${due}`;
}

export function buildMeetingIntakeSignals(
  intakeForm: IntakeForm | null,
): string[] {
  if (!intakeForm) return [];

  return [
    intakeForm.budgetMentioned ? `Budget: ${intakeForm.budgetMentioned}` : null,
    intakeForm.timeline ? `Timeline: ${intakeForm.timeline}` : null,
    ...intakeForm.decisionMakers.map((item) => `Decision maker: ${item}`),
    ...intakeForm.painPoints.map((item) => `Pain: ${item}`),
    ...intakeForm.requirements.map((item) => `Need: ${item}`),
  ].filter((item): item is string => Boolean(item));
}
