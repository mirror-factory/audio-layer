import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GetMeetingSchema,
  GetSummarySchema,
  GetTranscriptSchema,
  ListMeetingsSchema,
  MCP_TOOLS,
  PrepareNotesPushSchema,
  SearchMeetingsSchema,
  ShowMeetingDashboardSchema,
  handleGetMeeting,
  handleGetSummary,
  handleGetTranscript,
  handleListMeetings,
  handlePrepareNotesPush,
  handleSearchMeetings,
  handleShowMeetingDashboard,
} from "@/lib/mcp/tools";
import { getLayersMeetingDashboardHtml } from "@/lib/mcp/ui";
import { searchMeetings } from "@/lib/embeddings/search";
import { getMeetingsStore } from "@/lib/meetings/store";

vi.mock("@/lib/embeddings/search", () => ({
  searchMeetings: vi.fn(),
}));

vi.mock("@/lib/meetings/store", () => ({
  getMeetingsStore: vi.fn(),
}));

describe("MCP tool schemas", () => {
  it("registers the expected tool catalog", () => {
    expect(MCP_TOOLS.map((tool) => tool.name)).toEqual([
      "search_meetings",
      "get_meeting",
      "list_meetings",
      "get_transcript",
      "get_summary",
      "start_recording",
      "prepare_notes_push",
      "show_meeting_dashboard",
    ]);
  });

  it("enforces argument boundaries", () => {
    expect(SearchMeetingsSchema.safeParse({ query: "pricing", limit: 10 }).success).toBe(true);
    expect(SearchMeetingsSchema.safeParse({ query: "pricing", limit: 51 }).success).toBe(false);
    expect(ListMeetingsSchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(ListMeetingsSchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(GetMeetingSchema.safeParse({ meeting_id: "meeting_1" }).success).toBe(true);
    expect(GetTranscriptSchema.safeParse({ meeting_id: "meeting_1" }).success).toBe(true);
    expect(GetSummarySchema.safeParse({ meeting_id: "meeting_1" }).success).toBe(true);
    expect(ShowMeetingDashboardSchema.safeParse({ limit: 25 }).success).toBe(true);
    expect(ShowMeetingDashboardSchema.safeParse({ limit: 26 }).success).toBe(false);
    expect(PrepareNotesPushSchema.safeParse({
      meeting_id: "meeting_1",
      trigger: "manual_push",
      destination: "mcp_client",
    }).success).toBe(true);
    expect(PrepareNotesPushSchema.safeParse({
      meeting_id: "meeting_1",
      destination: "",
    }).success).toBe(false);
  });
});

describe("MCP App UI", () => {
  it("renders the Layers meeting dashboard shell", () => {
    const html = getLayersMeetingDashboardHtml();

    // Reflects the Paper Calm rebrand 2026-05-01: title is now
    // "Your recent meetings" with a "Meeting memory" eyebrow + an
    // inline Layers brand mark.
    expect(html).toContain("Your recent meetings");
    expect(html).toContain("Meeting memory");
    expect(html).toContain('class="brand"');
    expect(html).toContain('aria-label="Refresh meetings"');
    expect(html).toContain("show_meeting_dashboard");
  });
});

describe("MCP tool handlers", () => {
  beforeEach(() => {
    vi.mocked(searchMeetings).mockReset();
    vi.mocked(getMeetingsStore).mockReset();
  });

  it("scopes semantic search by authenticated user", async () => {
    vi.mocked(searchMeetings).mockResolvedValue([
      {
        meetingId: "meeting_1",
        meetingTitle: "Pricing",
        meetingDate: "2026-04-24T00:00:00.000Z",
        chunkText: "Budget",
        chunkType: "transcript",
        similarity: 0.9,
      },
    ]);

    const results = await handleSearchMeetings({ query: "pricing", limit: 7 }, "user_a");

    expect(searchMeetings).toHaveBeenCalledWith("pricing", "user_a", 7);
    expect(results).toHaveLength(1);
  });

  it("defaults list limit and returns recent meetings", async () => {
    const list = vi.fn().mockResolvedValue([
      {
        id: "meeting_1",
        title: "Roadmap",
        status: "completed",
        durationSeconds: 1200,
        createdAt: "2026-04-24T00:00:00.000Z",
      },
    ]);
    vi.mocked(getMeetingsStore).mockResolvedValue({
      insert: vi.fn(),
      update: vi.fn(),
      get: vi.fn(),
      list,
      delete: vi.fn(),
    });

    const results = await handleListMeetings({}, "user_a");

    expect(list).toHaveBeenCalledWith(20);
    expect(results).toHaveLength(1);
  });

  it("builds the MCP App dashboard payload from recent meetings", async () => {
    const list = vi.fn().mockResolvedValue([
      {
        id: "meeting_1",
        title: "Roadmap",
        status: "completed",
        durationSeconds: 1800,
        createdAt: "2026-04-24T00:00:00.000Z",
      },
      {
        id: "meeting_2",
        title: "Pipeline",
        status: "processing",
        durationSeconds: 600,
        createdAt: "2026-04-24T01:00:00.000Z",
      },
    ]);
    vi.mocked(getMeetingsStore).mockResolvedValue({
      insert: vi.fn(),
      update: vi.fn(),
      get: vi.fn(),
      list,
      delete: vi.fn(),
    });

    const payload = await handleShowMeetingDashboard({ limit: 2 }, "user_a");

    expect(list).toHaveBeenCalledWith(2);
    expect(payload.stats).toMatchObject({
      total: 2,
      completed: 1,
      processing: 1,
      totalMinutes: 40,
    });
    expect(payload.meetings[0]).toMatchObject({
      id: "meeting_1",
      title: "Roadmap",
      duration: "30 min",
    });
  });

  it("returns meeting detail, transcript, and summary through the store", async () => {
    const meeting = {
      id: "meeting_1",
      title: "Demo",
      status: "completed" as const,
      text: "Transcript text",
      utterances: [],
      durationSeconds: 1200,
      summary: {
        title: "Demo",
        summary: "Summary text",
        keyPoints: ["Point"],
        actionItems: [],
        decisions: [],
        participants: ["Speaker A"],
      },
      intakeForm: null,
      costBreakdown: null,
      error: null,
      createdAt: "2026-04-24T00:00:00.000Z",
      updatedAt: "2026-04-24T00:00:00.000Z",
    };
    const get = vi.fn().mockResolvedValue(meeting);
    vi.mocked(getMeetingsStore).mockResolvedValue({
      insert: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      get,
      delete: vi.fn(),
    });

    await expect(handleGetMeeting({ meeting_id: "meeting_1" }, "user_a")).resolves.toMatchObject({ id: "meeting_1" });
    await expect(handleGetTranscript({ meeting_id: "meeting_1" }, "user_a")).resolves.toBe("Transcript text");
    await expect(handleGetSummary({ meeting_id: "meeting_1" }, "user_a")).resolves.toMatchObject({ summary: "Summary text" });
    expect(get).toHaveBeenCalledWith("meeting_1");
  });

  it("prepares an explicit notes push payload without transmitting data", async () => {
    const get = vi.fn().mockResolvedValue({
      id: "meeting_1",
      title: "Launch review",
      status: "completed",
      text: "Transcript text",
      utterances: [],
      durationSeconds: 1200,
      summary: {
        title: "Launch review",
        summary: "The team reviewed launch readiness.",
        keyPoints: [],
        actionItems: [{ assignee: "Alex", task: "Send timeline", dueDate: null }],
        decisions: ["Launch remains on track"],
        participants: [],
      },
      intakeForm: null,
      costBreakdown: null,
      error: null,
      createdAt: "2026-04-24T00:00:00.000Z",
      updatedAt: "2026-04-24T00:00:00.000Z",
    });
    vi.mocked(getMeetingsStore).mockResolvedValue({
      insert: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      get,
      delete: vi.fn(),
    });

    const payload = await handlePrepareNotesPush({
      meeting_id: "meeting_1",
      trigger: "manual_push",
      destination: "mcp_client",
      include_transcript: false,
    }, "user_a");

    expect(payload).toMatchObject({
      ready: true,
      meetingId: "meeting_1",
      destination: "mcp_client",
      actionItemCount: 1,
      decisionCount: 1,
    });
    if (!payload.ready) {
      throw new Error("Expected a ready notes push payload");
    }
    expect(payload.markdown).toContain("## Action Items");
    expect(payload.markdown).not.toContain("## Transcript");
  });
});
