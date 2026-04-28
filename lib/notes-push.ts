import { z } from "zod";
import type { Meeting } from "@/lib/meetings/types";

export const NotesPushTriggerSchema = z.enum([
  "manual_push",
  "meeting_completed",
  "action_items_detected",
  "decision_detected",
]);

export const NotesPushPackageRequestSchema = z.object({
  destination: z
    .string()
    .min(1)
    .max(80)
    .describe("Explicit destination label for this notes package."),
  trigger: NotesPushTriggerSchema.optional()
    .default("manual_push")
    .describe("Why this notes package is being prepared."),
  include_transcript: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include transcript text in the returned package."),
});

export type NotesPushTrigger = z.infer<typeof NotesPushTriggerSchema>;
export type NotesPushPackageRequest = z.infer<
  typeof NotesPushPackageRequestSchema
>;

export interface NotesPushPackage {
  ready: true;
  meetingId: string;
  title: string;
  trigger: NotesPushTrigger;
  destination: string;
  generatedAt: string;
  actionItemCount: number;
  decisionCount: number;
  markdown: string;
  payload: {
    summary: Meeting["summary"];
    intakeForm: Meeting["intakeForm"];
    actionItems: NonNullable<Meeting["summary"]>["actionItems"];
    decisions: string[];
    transcript?: string;
  };
}

export interface MissingNotesPushPackage {
  ready: false;
  error: string;
  meetingId: string;
  trigger: NotesPushTrigger;
  destination: string;
}

function formatActionItem(
  item: NonNullable<Meeting["summary"]>["actionItems"][number],
): string {
  const owner = item.assignee ? `${item.assignee}: ` : "";
  const due = item.dueDate ? ` (due ${item.dueDate})` : "";
  return `${owner}${item.task}${due}`;
}

function listSection(title: string, items: string[]): string | null {
  if (items.length === 0) return null;
  return `\n## ${title}\n${items.map((item) => `- ${item}`).join("\n")}`;
}

export function buildMissingNotesPushPackage(
  request: NotesPushPackageRequest & { meeting_id: string },
): MissingNotesPushPackage {
  return {
    ready: false,
    error: "Meeting not found",
    meetingId: request.meeting_id,
    destination: request.destination,
    trigger: request.trigger,
  };
}

export function buildNotesPushPackage(
  meeting: Meeting,
  request: NotesPushPackageRequest,
): NotesPushPackage {
  const summary = meeting.summary;
  const actionItems = summary?.actionItems ?? [];
  const decisions = summary?.decisions ?? [];
  const title = meeting.title ?? summary?.title ?? "Untitled meeting";
  const intake = meeting.intakeForm;
  const intakeSignals = [
    intake?.intent && intake.intent !== "unclear" ? `Intent: ${intake.intent}` : null,
    intake?.budgetMentioned ? `Budget: ${intake.budgetMentioned}` : null,
    intake?.timeline ? `Timeline: ${intake.timeline}` : null,
    ...(intake?.requirements ?? []).map((item) => `Requirement: ${item}`),
    ...(intake?.painPoints ?? []).map((item) => `Pain: ${item}`),
    ...(intake?.nextSteps ?? []).map((item) => `Next step: ${item}`),
  ].filter((item): item is string => Boolean(item));

  const markdown = [
    `# ${title}`,
    summary?.summary ? `\n${summary.summary}` : null,
    listSection("Key Points", summary?.keyPoints ?? []),
    listSection("Decisions", decisions),
    listSection("Action Items", actionItems.map(formatActionItem)),
    listSection("Intake Context", intakeSignals),
    request.include_transcript && meeting.text
      ? `\n## Transcript\n${meeting.text}`
      : null,
  ].filter(Boolean).join("\n");

  return {
    ready: true,
    meetingId: meeting.id,
    title,
    trigger: request.trigger,
    destination: request.destination,
    generatedAt: new Date().toISOString(),
    actionItemCount: actionItems.length,
    decisionCount: decisions.length,
    markdown,
    payload: {
      summary,
      intakeForm: intake,
      actionItems,
      decisions,
      transcript: request.include_transcript ? meeting.text ?? "" : undefined,
    },
  };
}
