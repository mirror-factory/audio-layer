import type { Meeting } from "@/lib/meetings/types";

type ChatMessageLike = {
  role?: string;
  content?: unknown;
  parts?: Array<{
    type?: string;
    text?: unknown;
  }>;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "could",
  "from",
  "have",
  "into",
  "meeting",
  "notes",
  "please",
  "show",
  "that",
  "this",
  "what",
  "when",
  "where",
  "with",
  "would",
]);

function textParts(message: ChatMessageLike): string[] {
  const parts = message.parts
    ?.filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => String(part.text).trim())
    .filter(Boolean);

  if (parts?.length) return parts;
  return typeof message.content === "string" && message.content.trim()
    ? [message.content.trim()]
    : [];
}

export function extractLastUserText(messages: ChatMessageLike[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    const text = textParts(message).join("\n").trim();
    if (text) return text;
  }
  return "";
}

function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function bullets(values: string[] | undefined, empty = "Not found in saved notes."): string {
  if (!values?.length) return `- ${empty}`;
  return values.map((value) => `- ${value}`).join("\n");
}

function actionBullets(meeting: Meeting): string {
  const items = meeting.summary?.actionItems ?? [];
  if (items.length === 0) return "- No action items found in saved notes.";

  return items
    .map((item) => {
      const assignee = item.assignee ? `${item.assignee}: ` : "";
      const due = item.dueDate ? ` (due ${item.dueDate})` : "";
      return `- ${assignee}${item.task}${due}`;
    })
    .join("\n");
}

function title(meeting: Meeting): string {
  return meeting.title ?? meeting.summary?.title ?? "Untitled recording";
}

function relevantSnippets(meeting: Meeting, prompt: string, limit = 3): string[] {
  const promptWords = new Set(words(prompt));
  const utterances = meeting.utterances ?? [];

  const scored = utterances
    .map((utterance, index) => {
      const utteranceWords = words(utterance.text);
      const score = utteranceWords.reduce(
        (total, word) => total + (promptWords.has(word) ? 1 : 0),
        0,
      );
      return {
        index,
        score,
        speaker: utterance.speaker,
        text: utterance.text.trim(),
      };
    })
    .filter((item) => item.text.length > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const selected = scored.filter((item) => item.score > 0).slice(0, limit);
  const fallback = selected.length > 0 ? selected : scored.slice(0, limit);

  return fallback.map((item) => {
    const speaker = item.speaker ? `${item.speaker}: ` : "";
    return `[S${item.index + 1}] ${speaker}${item.text}`;
  });
}

function transcriptSection(meeting: Meeting, prompt: string): string {
  const snippets = relevantSnippets(meeting, prompt);
  if (snippets.length === 0) return "- No transcript segments are available.";
  return snippets.map((snippet) => `- ${snippet}`).join("\n");
}

function intakeSection(meeting: Meeting): string {
  const intake = meeting.intakeForm;
  if (!intake) return "- No structured intake fields have been extracted yet.";

  return [
    `- Intent: ${intake.intent}`,
    `- Primary participant: ${intake.primaryParticipant ?? "Not found"}`,
    `- Organization: ${intake.organization ?? "Not found"}`,
    `- Budget: ${intake.budgetMentioned ?? "Not found"}`,
    `- Timeline: ${intake.timeline ?? "Not found"}`,
    `- Decision makers: ${intake.decisionMakers.length ? intake.decisionMakers.join(", ") : "Not found"}`,
    `- Requirements: ${intake.requirements.length ? intake.requirements.join("; ") : "Not found"}`,
    `- Pain points: ${intake.painPoints.length ? intake.painPoints.join("; ") : "Not found"}`,
    `- Next steps: ${intake.nextSteps.length ? intake.nextSteps.join("; ") : "Not found"}`,
  ].join("\n");
}

function localNotice(): string {
  return "Local answer from saved notes and transcript.";
}

function buildSalesBrief(meeting: Meeting, prompt: string): string {
  const intake = meeting.intakeForm;
  return [
    `## Sales Discovery Brief`,
    localNotice(),
    "",
    `### Meeting`,
    `- ${title(meeting)}`,
    "",
    `### Pain Points`,
    bullets(intake?.painPoints),
    "",
    `### Budget And Timeline`,
    `- Budget: ${intake?.budgetMentioned ?? "Not found in saved notes."}`,
    `- Timeline: ${intake?.timeline ?? "Not found in saved notes."}`,
    "",
    `### Decision Makers`,
    bullets(intake?.decisionMakers),
    "",
    `### Requirements`,
    bullets(intake?.requirements),
    "",
    `### Decisions`,
    bullets(meeting.summary?.decisions),
    "",
    `### Next Steps`,
    intake?.nextSteps.length ? bullets(intake.nextSteps) : actionBullets(meeting),
    "",
    `### Evidence`,
    transcriptSection(meeting, prompt),
  ].join("\n");
}

function buildFollowUp(meeting: Meeting): string {
  return [
    `Subject: Follow-up from ${title(meeting)}`,
    "",
    "Hi,",
    "",
    "Thanks for the conversation. Here is the concise recap I captured:",
    "",
    meeting.summary?.summary ?? "The saved notes do not include a generated summary yet.",
    "",
    "Decisions:",
    bullets(meeting.summary?.decisions),
    "",
    "Next steps:",
    actionBullets(meeting),
    "",
    "Best,",
  ].join("\n");
}

function buildStandup(meeting: Meeting, prompt: string): string {
  return [
    "## Standup Summary",
    localNotice(),
    "",
    "### Progress",
    bullets(meeting.summary?.keyPoints),
    "",
    "### Decisions",
    bullets(meeting.summary?.decisions),
    "",
    "### Owners And Actions",
    actionBullets(meeting),
    "",
    "### Evidence",
    transcriptSection(meeting, prompt),
  ].join("\n");
}

function buildInterview(meeting: Meeting, prompt: string): string {
  return [
    "## Interview Debrief",
    localNotice(),
    "",
    "### Summary",
    meeting.summary?.summary ?? "No summary was saved for this meeting.",
    "",
    "### Strengths / Evidence",
    bullets(meeting.summary?.keyPoints),
    "",
    "### Concerns / Follow-ups",
    actionBullets(meeting),
    "",
    "### Transcript Evidence",
    transcriptSection(meeting, prompt),
  ].join("\n");
}

function buildGeneralAnswer(meeting: Meeting, prompt: string): string {
  const lower = prompt.toLowerCase();

  if (lower.includes("decision")) {
    return [
      "## Decisions",
      localNotice(),
      "",
      bullets(meeting.summary?.decisions),
      "",
      "### Evidence",
      transcriptSection(meeting, prompt),
    ].join("\n");
  }

  if (lower.includes("action") || lower.includes("next step") || lower.includes("follow up")) {
    return [
      "## Action Items",
      localNotice(),
      "",
      actionBullets(meeting),
      "",
      "### Evidence",
      transcriptSection(meeting, prompt),
    ].join("\n");
  }

  if (lower.includes("intake") || lower.includes("budget") || lower.includes("timeline")) {
    return [
      "## Intake Record",
      localNotice(),
      "",
      intakeSection(meeting),
      "",
      "### Evidence",
      transcriptSection(meeting, prompt),
    ].join("\n");
  }

  return [
    "## Meeting Answer",
    localNotice(),
    "",
    "### Summary",
    meeting.summary?.summary ?? "No summary was saved for this meeting.",
    "",
    "### Key Points",
    bullets(meeting.summary?.keyPoints),
    "",
    "### Decisions",
    bullets(meeting.summary?.decisions),
    "",
    "### Action Items",
    actionBullets(meeting),
    "",
    "### Relevant Transcript",
    transcriptSection(meeting, prompt),
  ].join("\n");
}

export function buildLocalMeetingAnswer(meeting: Meeting, prompt: string): string {
  const lower = prompt.toLowerCase();

  if (lower.includes("sales") || lower.includes("discovery")) {
    return buildSalesBrief(meeting, prompt);
  }

  if (lower.includes("follow-up") || lower.includes("follow up") || lower.includes("email")) {
    return buildFollowUp(meeting);
  }

  if (lower.includes("standup") || lower.includes("blocker")) {
    return buildStandup(meeting, prompt);
  }

  if (lower.includes("interview") || lower.includes("candidate")) {
    return buildInterview(meeting, prompt);
  }

  return buildGeneralAnswer(meeting, prompt);
}

export function buildLocalLibraryChatAnswer(): string {
  return [
    "Open a completed meeting to ask questions grounded in its saved notes and transcript.",
    "",
    "Library-wide chat needs a configured AI model because it has to search and reason across multiple meetings.",
  ].join("\n");
}
