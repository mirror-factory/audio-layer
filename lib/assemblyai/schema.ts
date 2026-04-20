import { z } from "zod";

export const ActionItemSchema = z.object({
  assignee: z
    .string()
    .nullable()
    .describe("Speaker name, label (e.g. 'Speaker A'), or null if unclear"),
  task: z.string().describe("The concrete task to be done"),
  dueDate: z
    .string()
    .nullable()
    .describe("ISO date if explicitly mentioned in the transcript, else null"),
});

export const MeetingSummarySchema = z.object({
  title: z
    .string()
    .describe(
      "A 3-8 word headline for the meeting (no period). If unclear, use 'Untitled recording'.",
    ),
  summary: z
    .string()
    .describe("A 2-3 sentence neutral overview of what the meeting was about"),
  keyPoints: z
    .array(z.string())
    .describe("3 to 7 bullet points covering the main discussion topics"),
  actionItems: z
    .array(ActionItemSchema)
    .describe("Discrete tasks with assignees when identifiable"),
  decisions: z
    .array(z.string())
    .describe(
      "Concrete decisions or conclusions reached during the meeting (empty array if none)",
    ),
  participants: z
    .array(z.string())
    .describe(
      "Names or speaker labels of everyone who spoke (use Speaker A/B/... when names unknown)",
    ),
});

export type ActionItem = z.infer<typeof ActionItemSchema>;
export type MeetingSummary = z.infer<typeof MeetingSummarySchema>;
