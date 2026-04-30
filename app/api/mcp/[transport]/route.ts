import { createMcpHandler } from "mcp-handler";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { searchMeetings } from "@/lib/embeddings/search";
import { validateMcpBearerToken } from "@/lib/mcp/auth";
import {
  buildMeetingDashboardPayload,
  getLayersMeetingDashboardHtml,
  LAYERS_MCP_DASHBOARD_RESOURCE_CONFIG,
  LAYERS_MCP_DASHBOARD_RESOURCE_URI,
} from "@/lib/mcp/ui";

// ---------------------------------------------------------------------------
// Query helpers (service role, scoped by user_id)
// ---------------------------------------------------------------------------

async function getMeeting(id: string, userId: string | null) {
  const supabase = getSupabaseServer();
  if (!supabase || !userId) return null;
  const { data } = await supabase
    .from("meetings").select("*")
    .eq("id", id).eq("user_id", userId).single();
  return data;
}

async function listMeetings(limit: number, userId: string | null) {
  const supabase = getSupabaseServer();
  if (!supabase || !userId) return [];
  const { data } = await supabase
    .from("meetings")
    .select("id, title, status, duration_seconds, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((m: Record<string, unknown>) => {
    const durationSeconds = Number(m.duration_seconds ?? 0);

    return {
      id: m.id,
      title: m.title ?? "Untitled",
      status: m.status,
      duration: durationSeconds
        ? `${Math.max(1, Math.round(durationSeconds / 60))} min`
        : null,
      durationSeconds,
      date: m.created_at,
    };
  });
}

function buildNotesPushPayload(
  meeting: Record<string, unknown>,
  input: {
    meeting_id: string;
    trigger: string;
    destination: string;
    include_transcript?: boolean;
  },
) {
  const summary = meeting.summary && typeof meeting.summary === "object"
    ? meeting.summary as {
        title?: unknown;
        summary?: unknown;
        actionItems?: unknown;
        decisions?: unknown;
      }
    : null;
  const actionItems = Array.isArray(summary?.actionItems)
    ? summary.actionItems as Array<{ assignee?: string | null; task?: string; dueDate?: string | null }>
    : [];
  const decisions = Array.isArray(summary?.decisions)
    ? summary.decisions.filter((item): item is string => typeof item === "string")
    : [];
  const title =
    typeof meeting.title === "string" && meeting.title
      ? meeting.title
      : typeof summary?.title === "string" && summary.title
        ? summary.title
        : "Untitled meeting";
  const transcript = typeof meeting.text === "string" ? meeting.text : "";
  const markdown = [
    `# ${title}`,
    typeof summary?.summary === "string" ? `\n${summary.summary}` : null,
    actionItems.length
      ? `\n## Action Items\n${actionItems
          .map((item) => {
            const owner = item.assignee ? `${item.assignee}: ` : "";
            const due = item.dueDate ? ` (due ${item.dueDate})` : "";
            return `- ${owner}${item.task ?? ""}${due}`.trimEnd();
          })
          .join("\n")}`
      : null,
    decisions.length
      ? `\n## Decisions\n${decisions.map((decision) => `- ${decision}`).join("\n")}`
      : null,
    input.include_transcript && transcript ? `\n## Transcript\n${transcript}` : null,
  ].filter(Boolean).join("\n");

  return {
    ready: true,
    meetingId: input.meeting_id,
    title,
    trigger: input.trigger,
    destination: input.destination,
    generatedAt: new Date().toISOString(),
    actionItemCount: actionItems.length,
    decisionCount: decisions.length,
    markdown,
    payload: {
      summary,
      actionItems,
      decisions,
      transcript: input.include_transcript ? transcript : undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// MCP tools
// ---------------------------------------------------------------------------

function createLayersMcpHandler(userId: string | null) {
  return createMcpHandler(
    (server) => {
      server.tool(
        "search_meetings",
        "Search meeting transcripts and summaries using natural language.",
        {
          query: z.string().describe("Natural language search query"),
          limit: z.number().int().min(1).max(50).optional(),
        },
        async ({ query, limit }) => {
          if (!userId) {
            return {
              content: [{ type: "text" as const, text: "Not authenticated" }],
            };
          }
          const results = await searchMeetings(query, userId, limit ?? 10);
          return {
            content: [
              { type: "text" as const, text: JSON.stringify(results, null, 2) },
            ],
          };
        },
      );

      server.tool(
        "get_meeting",
        "Get full meeting details including transcript, summary, cost.",
        {
          meeting_id: z.string(),
        },
        async ({ meeting_id }) => {
          const m = await getMeeting(meeting_id, userId);
          return {
            content: [
              {
                type: "text" as const,
                text: m ? JSON.stringify(m, null, 2) : "Meeting not found",
              },
            ],
          };
        },
      );

      server.tool(
        "list_meetings",
        "List recent meetings with status, title, duration.",
        {
          limit: z.number().int().min(1).max(100).optional(),
        },
        async ({ limit }) => {
          const meetings = await listMeetings(limit ?? 20, userId);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(meetings, null, 2),
              },
            ],
          };
        },
      );

      server.tool(
        "get_transcript",
        "Get the full transcript text of a meeting.",
        {
          meeting_id: z.string(),
        },
        async ({ meeting_id }) => {
          const m = await getMeeting(meeting_id, userId);
          return {
            content: [
              {
                type: "text" as const,
                text: (m?.text as string) ?? "No transcript available",
              },
            ],
          };
        },
      );

      server.tool(
        "get_summary",
        "Get the AI-generated summary with key points, action items, decisions.",
        {
          meeting_id: z.string(),
        },
        async ({ meeting_id }) => {
          const m = await getMeeting(meeting_id, userId);
          return {
            content: [
              {
                type: "text" as const,
                text: m?.summary
                  ? JSON.stringify(m.summary, null, 2)
                  : "No summary available",
              },
            ],
          };
        },
      );

      server.tool(
        "start_recording",
        "Start a new audio recording session.",
        {},
        async () => {
          return {
            content: [
              {
                type: "text" as const,
                text: "Recording must be started from the app UI. Navigate to /record/live in the Layers app.",
              },
            ],
          };
        },
      );

      server.tool(
        "prepare_notes_push",
        "Prepare a scoped notes payload for an explicit MCP-client pull. This does not transmit notes to a third-party destination.",
        {
          meeting_id: z.string(),
          trigger: z
            .enum([
              "manual_push",
              "meeting_completed",
              "action_items_detected",
              "decision_detected",
            ])
            .optional()
            .default("manual_push"),
          destination: z.string().min(1).max(80),
          include_transcript: z.boolean().optional().default(false),
        },
        async ({ meeting_id, trigger, destination, include_transcript }) => {
          if (!userId) {
            return {
              content: [{ type: "text" as const, text: "Not authenticated" }],
            };
          }

          const meeting = await getMeeting(meeting_id, userId);
          if (!meeting) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    ready: false,
                    error: "Meeting not found",
                    meetingId: meeting_id,
                    destination,
                    trigger,
                  }),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  buildNotesPushPayload(meeting, {
                    meeting_id,
                    trigger,
                    destination,
                    include_transcript,
                  }),
                  null,
                  2,
                ),
              },
            ],
          };
        },
      );

      registerAppResource(
        server,
        "Layers Meeting Dashboard",
        LAYERS_MCP_DASHBOARD_RESOURCE_URI,
        {
          description:
            "Interactive Claude MCP App dashboard for recent Layers meetings.",
          ...LAYERS_MCP_DASHBOARD_RESOURCE_CONFIG,
        },
        async () => ({
          contents: [
            {
              uri: LAYERS_MCP_DASHBOARD_RESOURCE_URI,
              mimeType: RESOURCE_MIME_TYPE,
              text: getLayersMeetingDashboardHtml(),
              _meta: LAYERS_MCP_DASHBOARD_RESOURCE_CONFIG._meta,
            },
          ],
        }),
      );

      registerAppTool(
        server,
        "show_meeting_dashboard",
        {
          title: "Show Meeting Dashboard",
          description:
            "Display a compact interactive dashboard of the authenticated user's recent Layers meetings.",
          inputSchema: {
            limit: z
              .number()
              .int()
              .min(1)
              .max(25)
              .optional()
              .describe("Max recent meetings to include in the UI."),
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
          },
          _meta: {
            ui: {
              resourceUri: LAYERS_MCP_DASHBOARD_RESOURCE_URI,
            },
          },
        },
        async ({ limit }) => {
          if (!userId) {
            return {
              isError: true,
              content: [{ type: "text" as const, text: "Not authenticated" }],
            };
          }

          const meetings = await listMeetings(limit ?? 12, userId);
          const payload = buildMeetingDashboardPayload(meetings);

          return {
            structuredContent: payload as unknown as Record<string, unknown>,
            content: [
              {
                type: "text" as const,
                text: `Showing ${payload.meetings.length} recent Layers meetings.`,
              },
            ],
          };
        },
      );
    },
    { serverInfo: { name: "layers", version: "1.0.0" } },
    { basePath: "/api/mcp", maxDuration: 60 },
  );
}

// ---------------------------------------------------------------------------
// Auth wrapper — validates API key, sets userId for tool queries
// ---------------------------------------------------------------------------

// Auth wrapper that allows initialize/notifications without auth
// but requires auth for tools/list and tools/call
async function handler(req: Request) {
  // Clone request to peek at the body for method routing
  const cloned = req.clone();
  let isProtocolHandshake = false;

  if (req.method === "POST") {
    try {
      const body = await cloned.json();
      const method = body?.method as string;
      isProtocolHandshake = method === "initialize" || method?.startsWith("notifications/");
    } catch {
      // not JSON — let mcp-handler deal with it
    }
  }

  // Allow protocol handshake without auth
  if (isProtocolHandshake || req.method === "DELETE") {
    return createLayersMcpHandler(null)(req);
  }

  // Everything else (tools/list, tools/call, GET for SSE) requires auth
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    const origin = new URL(req.url).origin;
    return new Response(
      JSON.stringify({ error: "invalid_token", error_description: "Bearer token required. Get your API key from the Layers profile page." }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
        },
      },
    );
  }

  const key = auth.slice(7);
  const result = await validateMcpBearerToken(key);
  if (!result) {
    return new Response(
      JSON.stringify({ error: "invalid_token", error_description: "Invalid bearer token" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  return createLayersMcpHandler(result.userId)(req);
}

export { handler as GET, handler as POST, handler as DELETE };
