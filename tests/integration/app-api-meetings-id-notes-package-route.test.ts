import { POST } from "@/app/api/meetings/[id]/notes-package/route";
import { getMeetingsStore, type MeetingsStore } from "@/lib/meetings/store";
import type { Meeting } from "@/lib/meetings/types";
import { getCurrentUserId } from "@/lib/supabase/user";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/user", () => ({
  getCurrentUserId: vi.fn(),
}));

vi.mock("@/lib/meetings/store", () => ({
  getMeetingsStore: vi.fn(),
}));

const completedMeeting: Meeting = {
  id: "meeting_notes_package_1",
  status: "completed",
  title: "Product Planning",
  text:
    "Maya confirmed transcript search is next. Ethan asked for calendar context before recording.",
  utterances: [],
  durationSeconds: 1200,
  summary: {
    title: "Product Planning",
    summary:
      "The team aligned on transcript search, calendar context, and follow-up ownership.",
    keyPoints: [
      "Transcript search is the next priority.",
      "Calendar context should appear before recording starts.",
    ],
    actionItems: [
      {
        assignee: "Maya",
        task: "Prototype the transcript search flow",
        dueDate: "2026-05-06",
      },
      {
        assignee: "Ethan",
        task: "Draft calendar context copy",
        dueDate: null,
      },
    ],
    decisions: ["Prioritize transcript search before broader library work."],
    participants: ["Maya", "Ethan"],
  },
  intakeForm: {
    intent: "roadmap planning",
    primaryParticipant: "Maya",
    organization: "Layers",
    contactInfo: { email: null, phone: null },
    budgetMentioned: null,
    timeline: "Prototype this week",
    decisionMakers: ["Maya"],
    requirements: ["Calendar context before recording"],
    painPoints: ["Transcript search is hard to find"],
    nextSteps: ["Prototype the search flow"],
  },
  costBreakdown: null,
  error: null,
  createdAt: "2026-04-28T10:00:00.000Z",
  updatedAt: "2026-04-28T10:30:00.000Z",
};

function storeReturning(meeting: Meeting | null): MeetingsStore {
  return {
    insert: vi.fn(),
    update: vi.fn(),
    get: vi.fn().mockResolvedValue(meeting),
    list: vi.fn(),
    delete: vi.fn(),
  };
}

function request(body: unknown) {
  return new Request(
    "http://localhost/api/meetings/meeting_notes_package_1/notes-package",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "req_notes_package_test",
      },
      body: JSON.stringify(body),
    },
  ) as Parameters<typeof POST>[0];
}

describe("app/api/meetings/[id]/notes-package/route.ts integration behavior", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserId).mockReset();
    vi.mocked(getMeetingsStore).mockReset();
  });

  it("returns a structured markdown package without transcript by default", async () => {
    const store = storeReturning(completedMeeting);
    vi.mocked(getCurrentUserId).mockResolvedValue("user_a");
    vi.mocked(getMeetingsStore).mockResolvedValue(store);

    const response = await POST(
      request({
        destination: "agent_clipboard",
        trigger: "manual_push",
        include_transcript: false,
      }),
      {
        params: { id: completedMeeting.id },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req_notes_package_test");
    expect(store.get).toHaveBeenCalledWith(completedMeeting.id);
    expect(body).toMatchObject({
      ready: true,
      meetingId: completedMeeting.id,
      title: "Product Planning",
      trigger: "manual_push",
      destination: "agent_clipboard",
      actionItemCount: 2,
      decisionCount: 1,
    });
    expect(body.markdown).toContain("# Product Planning");
    expect(body.markdown).toContain("## Key Points");
    expect(body.markdown).toContain(
      "- Maya: Prototype the transcript search flow (due 2026-05-06)",
    );
    expect(body.markdown).toContain("## Intake Context");
    expect(body.markdown).not.toContain("## Transcript");
    expect(body.payload.transcript).toBeUndefined();
  });

  it("can include transcript text and defaults the trigger to manual_push", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user_a");
    vi.mocked(getMeetingsStore).mockResolvedValue(storeReturning(completedMeeting));

    const response = await POST(
      request({
        destination: "claude_mcp",
        include_transcript: true,
      }),
      {
        params: { id: completedMeeting.id },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.trigger).toBe("manual_push");
    expect(body.markdown).toContain("## Transcript");
    expect(body.markdown).toContain(completedMeeting.text);
    expect(body.payload.transcript).toBe(completedMeeting.text);
  });

  it("returns 404 when the meeting is not found", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user_a");
    vi.mocked(getMeetingsStore).mockResolvedValue(storeReturning(null));

    const response = await POST(
      request({
        destination: "agent_clipboard",
      }),
      {
        params: { id: "missing" },
      },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("x-request-id")).toBe("req_notes_package_test");
    await expect(response.json()).resolves.toEqual({
      error: "Meeting not found",
    });
  });
});
