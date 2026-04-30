export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { after } from "next/server";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { withRoute } from "@/lib/with-route";
import { withTelemetry, logAICall, logError } from "@/lib/ai/telemetry";
import { allTools } from "@/lib/ai/tools";
import { flushLangfuse } from "@/lib/langfuse-flush";
import { getCurrentUserId } from "@/lib/supabase/user";
import { getSettings } from "@/lib/settings";
import { authMode, resolveModel } from "@/lib/ai/model-router";
import { getMeetingsStore } from "@/lib/meetings/store";
import type { Meeting } from "@/lib/meetings/types";
import {
  buildLocalLibraryChatAnswer,
  buildLocalMeetingAnswer,
  extractLastUserText,
} from "@/lib/meeting-chat-fallback";

const SYSTEM_PROMPT = `You are a helpful meeting assistant for Layers. You can search across all of the user's past meetings, retrieve meeting details, and answer questions about their conversations.

You have 3 tools available:
- searchMeetings: Search across all meeting transcripts, summaries, and data using semantic search. Use this proactively when the user asks about past discussions.
- getMeetingDetails: Get the full transcript, summary, key points, action items, and decisions for a specific meeting.
- listRecentMeetings: List recent meetings with titles, dates, and statuses.

Be concise and direct. When answering from a meeting transcript, cite the relevant segment IDs when they are present, for example [S12]. When showing search results, summarize the key findings rather than dumping raw data. Always use tools when the user asks about their meetings — don't guess.`;

const MAX_TRANSCRIPT_CHARS = 8000;
const MAX_TRANSCRIPT_SEGMENTS = 90;

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trimEnd()}\n[Transcript truncated for token efficiency]`;
}

function formatStringList(label: string, values: string[] | undefined): string | null {
  if (!values?.length) return null;
  return `${label}:\n${values.map((value) => `- ${value}`).join("\n")}`;
}

function formatActionItems(meeting: Meeting): string | null {
  const items = meeting.summary?.actionItems;
  if (!items?.length) return null;
  return `Action items:\n${items
    .map((item) => {
      const owner = item.assignee ? `${item.assignee}: ` : "";
      const due = item.dueDate ? ` (due ${item.dueDate})` : "";
      return `- ${owner}${item.task}${due}`;
    })
    .join("\n")}`;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatTranscript(meeting: Meeting): string {
  const transcript =
    meeting.utterances.length > 0
      ? meeting.utterances
          .slice(0, MAX_TRANSCRIPT_SEGMENTS)
          .map((utterance, index) => {
            const speaker = utterance.speaker ? `${utterance.speaker}: ` : "";
            return `[S${index + 1} ${formatTime(utterance.start)}] ${speaker}${utterance.text}`;
          })
          .join("\n") +
        (meeting.utterances.length > MAX_TRANSCRIPT_SEGMENTS
          ? `\n[${meeting.utterances.length - MAX_TRANSCRIPT_SEGMENTS} later segments omitted for token efficiency]`
          : "")
      : meeting.text ?? "";

  return truncate(transcript.trim() || "[No transcript text is available yet]", MAX_TRANSCRIPT_CHARS);
}

function buildMeetingContext(meeting: Meeting): string {
  const summary = meeting.summary;
  const sections = [
    `Current meeting:
- ID: ${meeting.id}
- Title: ${meeting.title ?? summary?.title ?? "Untitled recording"}
- Date: ${meeting.createdAt}
- Status: ${meeting.status}
- Duration: ${
      meeting.durationSeconds != null
        ? `${Math.round(meeting.durationSeconds / 60)} minutes`
        : "unknown"
    }`,
    summary?.summary ? `Summary:\n${summary.summary}` : null,
    formatStringList("Participants", summary?.participants),
    formatStringList("Key points", summary?.keyPoints),
    formatActionItems(meeting),
    formatStringList("Decisions", summary?.decisions),
    `Transcript excerpt:\n${formatTranscript(meeting)}`,
  ].filter(Boolean);

  return sections.join("\n\n");
}

const ChatBodySchema = z.object({
  messages: z.array(
    z.object({
      id: z.string().min(1),
      role: z.string().min(1),
      parts: z.array(z.unknown()).optional(),
      content: z.unknown().optional(),
    }).passthrough(),
  ).min(1),
  meetingId: z.string().min(1).optional(),
}).passthrough();

function localChatResponse(answer: string): Response {
  const textId = "local-meeting-answer";
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: answer });
      writer.write({ type: "text-end", id: textId });
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      "x-layers-chat-mode": "local",
    },
  });
}

export const POST = withRoute(async (req, ctx) => {
  let body: {
    messages: UIMessage[];
    meetingId?: string;
  };
  try {
    body = ChatBodySchema.parse(await req.json()) as unknown as typeof body;
  } catch (err) {
    const zodErrors = err instanceof z.ZodError ? err.issues : null;
    return new Response(
      JSON.stringify({ error: zodErrors ?? "Invalid chat request body" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { messages, meetingId } = body;

  const userId = await getCurrentUserId();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const chatId = ctx.requestId;
  const startTime = Date.now();
  let ttftMs: number | null = null;
  const toolCallNames: string[] = [];

  const telemetryCtx = {
    userId,
    chatId,
    label: "chat",
  };

  let meetingContext = "";
  let meeting: Meeting | null = null;
  if (meetingId) {
    const store = await getMeetingsStore();
    meeting = await store.get(meetingId);
    if (!meeting) {
      return new Response(JSON.stringify({ error: "Meeting not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    meetingContext = buildMeetingContext(meeting);
  }

  if (authMode() === "unconfigured") {
    const prompt = extractLastUserText(messages);
    return localChatResponse(
      meeting
        ? buildLocalMeetingAnswer(meeting, prompt)
        : buildLocalLibraryChatAnswer(),
    );
  }

  const settings = await getSettings();
  const { model: resolvedModel } = await resolveModel(settings.summaryModel);
  const model = withTelemetry(resolvedModel, telemetryCtx);
  const modelMessages = await convertToModelMessages(messages);
  const system = meetingId
    ? `${SYSTEM_PROMPT}

Current meeting context:
- The user is viewing meeting ID "${meetingId}".
- Use the embedded meeting context below first when answering questions about "this meeting".
- Call getMeetingDetails only if you need more structured details than the embedded context provides.
- If the user asks for a sales, interview, standup, or custom template, ground the response in this meeting context.
- Include segment citations like [S4] when making factual claims from the transcript.

${meetingContext}`
    : SYSTEM_PROMPT;

  const result = streamText({
    model,
    system,
    messages: modelMessages,
    tools: allTools,
    stopWhen: stepCountIs(5),
    onChunk: ({ chunk }) => {
      if (ttftMs === null && chunk.type === "text-delta") {
        ttftMs = Date.now() - startTime;
      }
    },
    onFinish: async ({ usage, finishReason, steps }) => {
      try {
        // Collect tool call names
        for (const step of steps) {
          if (step.toolCalls) {
            for (const tc of step.toolCalls) {
              toolCallNames.push(tc.toolName);
            }
          }
        }

        await logAICall({
          context: telemetryCtx,
          modelId: settings.summaryModel,
          usage: {
            promptTokens: usage.inputTokens ?? 0,
            completionTokens: usage.outputTokens ?? 0,
          },
          durationMs: Date.now() - startTime,
          ttftMs,
          steps: steps.length,
          toolCalls: toolCallNames,
          finishReason: finishReason ?? null,
        });
      } catch {
        // Don't let telemetry errors break the response
      }
    },
    onError: async ({ error }) => {
      await logError({
        context: telemetryCtx,
        error,
        source: "chat-route",
        modelId: settings.summaryModel,
      }).catch(() => {});
    },
  });

  // Flush Langfuse after response is sent
  after(flushLangfuse);

  return result.toUIMessageStreamResponse();
});
