/**
 * IntakeForm — structured data extracted from a conversation.
 *
 * The differentiator from competitors: instead of just summarizing,
 * we pull the structured intake fields a sales / customer-success /
 * vendor / interview workflow actually needs. Runs as a second
 * generateObject call after summarization (cheap, parallelizable).
 *
 * Every field is nullable / array-empty by default — the model is
 * instructed to leave fields blank rather than invent data, so a
 * casual chat doesn't get hallucinated CRM fields.
 */

import { z } from "zod";
import { generateObject } from "ai";
import { withTelemetry } from "@/lib/ai/telemetry";
import type { UtteranceLike } from "./summary";
import { formatTranscriptForPrompt } from "./summary";

export const IntakeFormSchema = z.object({
  intent: z
    .string()
    .describe(
      "One-sentence description of what this conversation was for (e.g. 'sales discovery call', 'vendor demo', 'customer interview', 'standup'). Use 'unclear' when you can't tell.",
    ),
  primaryParticipant: z
    .string()
    .nullable()
    .describe(
      "Name or speaker label of the lead / client / customer / interview subject — the person the conversation centers on. Null if unclear.",
    ),
  organization: z
    .string()
    .nullable()
    .describe("Their company / org name if mentioned, else null"),
  contactInfo: z
    .object({
      email: z.string().nullable(),
      phone: z.string().nullable(),
    })
    .describe(
      "Contact details that were spoken or read out. Use null when not mentioned.",
    ),
  budgetMentioned: z
    .string()
    .nullable()
    .describe(
      "Budget figure, range, or qualitative descriptor as stated (e.g. '$50k', '5 figures', 'tight'). Null when unspoken.",
    ),
  timeline: z
    .string()
    .nullable()
    .describe(
      "Project timeline, deadline, or urgency the participants discussed.",
    ),
  decisionMakers: z
    .array(z.string())
    .describe(
      "Names of people identified as approvers / decision-makers / blockers (may be people not in the conversation).",
    ),
  requirements: z
    .array(z.string())
    .describe("Specific asks, must-haves, or feature requests mentioned."),
  painPoints: z
    .array(z.string())
    .describe(
      "Problems, frustrations, or current-state issues the primary participant raised.",
    ),
  nextSteps: z
    .array(z.string())
    .describe(
      "Concrete follow-ups both sides explicitly agreed to (distinct from generic action items).",
    ),
});

export type IntakeForm = z.infer<typeof IntakeFormSchema>;

const DEFAULT_MODEL = "anthropic/claude-sonnet-4-6";

interface ExtractOptions {
  transcriptId: string;
  utterances: UtteranceLike[];
  fullText?: string;
  modelId?: string;
}

export function emptyIntakeForm(): IntakeForm {
  return {
    intent: "unclear",
    primaryParticipant: null,
    organization: null,
    contactInfo: { email: null, phone: null },
    budgetMentioned: null,
    timeline: null,
    decisionMakers: [],
    requirements: [],
    painPoints: [],
    nextSteps: [],
  };
}

/**
 * Extract a structured IntakeForm from a transcript. Returns an
 * all-null/empty form when the input has no speech to ground on, so
 * downstream code can treat the result as always-present.
 */
export async function extractIntakeForm(
  opts: ExtractOptions,
): Promise<IntakeForm> {
  const { transcriptId, utterances, fullText, modelId } = opts;
  const body =
    utterances.length > 0
      ? formatTranscriptForPrompt(utterances)
      : (fullText ?? "");

  if (!body.trim()) return emptyIntakeForm();

  const prompt =
    "You are extracting structured intake data from a conversation transcript.\n" +
    "Strict rules:\n" +
    "- Only use facts present in the transcript. Do NOT invent, infer, or fill in plausible-sounding details.\n" +
    "- For any field you can't ground in the transcript, return null (single fields) or an empty array (lists).\n" +
    "- 'intent' must summarize what the conversation was for in one short phrase; use 'unclear' when ambiguous.\n" +
    "- 'nextSteps' is for explicit, agreed-to follow-ups; it should NOT duplicate generic action items.\n\n" +
    "Transcript:\n" +
    body;

  const { object } = await generateObject({
    model: modelId ?? process.env.DEFAULT_MODEL ?? DEFAULT_MODEL,
    schema: IntakeFormSchema,
    prompt,
    ...withTelemetry({
      label: "intake-form",
      metadata: { transcriptId },
    }),
  });
  return object;
}
