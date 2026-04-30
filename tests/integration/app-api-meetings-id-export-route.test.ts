import { GET } from "@/app/api/meetings/[id]/export/route";
import { getMeetingsStore, type MeetingsStore } from "@/lib/meetings/store";
import type { Meeting } from "@/lib/meetings/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/meetings/store", () => ({
  getMeetingsStore: vi.fn(),
}));

const completedMeeting: Meeting = {
  id: "meeting_export_1",
  status: "completed",
  title: "Product Planning",
  text: "Maya confirmed the onboarding plan.",
  utterances: [
    {
      speaker: "Maya",
      text: "Transcript search should be next.",
      start: 4000,
      end: 8200,
      confidence: 0.98,
    },
    {
      speaker: "Ethan",
      text: "Calendar context needs to appear before recording starts.",
      start: 18000,
      end: 22600,
      confidence: 0.96,
    },
  ],
  durationSeconds: 76,
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

function request(
  url = "http://localhost/api/meetings/meeting_export_1/export",
) {
  return new Request(url, {
    headers: { "x-request-id": "req_export_test" },
  }) as Parameters<typeof GET>[0];
}

describe("app/api/meetings/[id]/export/route.ts integration behavior", () => {
  beforeEach(() => {
    vi.mocked(getMeetingsStore).mockReset();
  });

  it("exports a completed meeting as markdown by default", async () => {
    const store = storeReturning(completedMeeting);
    vi.mocked(getMeetingsStore).mockResolvedValue(store);

    const response = await GET(request(), {
      params: { id: completedMeeting.id },
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req_export_test");
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="2026-04-28-product-planning.md"',
    );
    expect(body).toContain("# Product Planning");
    expect(body).toContain("## Key Points");
    expect(body).toContain("- Transcript search is the next priority.");
    expect(body).toContain(
      "- [ ] Prototype the transcript search flow (Maya) -- due 2026-05-06",
    );
    expect(store.get).toHaveBeenCalledWith(completedMeeting.id);
  });

  it("renders the pdf format as downloadable HTML fallback", async () => {
    vi.mocked(getMeetingsStore).mockResolvedValue(
      storeReturning(completedMeeting),
    );

    const response = await GET(
      request("http://localhost/api/meetings/meeting_export_1/export?format=pdf"),
      { params: { id: completedMeeting.id } },
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="2026-04-28-product-planning.html"',
    );
    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain("<h1>Product Planning</h1>");
  });

  it("returns 404 JSON for a missing meeting id", async () => {
    vi.mocked(getMeetingsStore).mockResolvedValue(storeReturning(null));

    const response = await GET(request(), {
      params: { id: "missing" },
    });

    await expect(response.json()).resolves.toEqual({
      error: "Meeting not found",
    });
    expect(response.status).toBe(404);
    expect(response.headers.get("x-request-id")).toBe("req_export_test");
  });
});
