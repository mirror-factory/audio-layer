import { POST } from "@/app/api/meetings/[id]/notes-package/route";
import { getMeetingsStore, type MeetingsStore } from "@/lib/meetings/store";
import type { Meeting } from "@/lib/meetings/types";
import { getCurrentUserId } from "@/lib/supabase/user";
import { apiRouteContracts } from "@/tests/api/route-contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/user", () => ({
  getCurrentUserId: vi.fn(),
}));

vi.mock("@/lib/meetings/store", () => ({
  getMeetingsStore: vi.fn(),
}));

const meeting: Meeting = {
  id: "contract_notes_package_1",
  status: "completed",
  title: "Notes Package Contract",
  text: "The endpoint should return a portable package.",
  utterances: [],
  durationSeconds: 180,
  summary: {
    title: "Notes Package Contract",
    summary: "The team validated the notes package contract.",
    keyPoints: ["Packages are markdown-first."],
    actionItems: [
      {
        assignee: "Alex",
        task: "Push notes to Claude",
        dueDate: null,
      },
    ],
    decisions: ["Keep the notes-package response JSON."],
    participants: ["Alex"],
  },
  intakeForm: null,
  costBreakdown: null,
  error: null,
  createdAt: "2026-04-28T14:00:00.000Z",
  updatedAt: "2026-04-28T14:01:00.000Z",
};

function storeReturning(row: Meeting | null): MeetingsStore {
  return {
    insert: vi.fn(),
    update: vi.fn(),
    get: vi.fn().mockResolvedValue(row),
    list: vi.fn(),
    delete: vi.fn(),
  };
}

function request(body: unknown) {
  return new Request(
    "http://localhost/api/meetings/contract_notes_package_1/notes-package",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "req_notes_package_contract",
      },
      body: JSON.stringify(body),
    },
  ) as Parameters<typeof POST>[0];
}

describe("app/api/meetings/[id]/notes-package/route.ts request and response contract", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserId).mockReset();
    vi.mocked(getMeetingsStore).mockReset();
  });

  it("is registered as an authenticated JSON POST route", () => {
    const contract = apiRouteContracts.find(
      (candidate) =>
        candidate.file === "app/api/meetings/[id]/notes-package/route.ts",
    );

    expect(contract).toMatchObject({
      route: "/api/meetings/[id]/notes-package",
      smokePath: "/api/meetings/sample/notes-package",
      methods: ["POST"],
      auth: "user",
      assertJson: true,
      requiresRequestId: true,
    });
    expect(contract?.smoke?.POST?.body).toEqual({
      destination: "agent_clipboard",
      trigger: "manual_push",
      include_transcript: false,
    });
  });

  it("returns the stable package response shape", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user_a");
    vi.mocked(getMeetingsStore).mockResolvedValue(storeReturning(meeting));

    const response = await POST(
      request({
        destination: "agent_clipboard",
        trigger: "decision_detected",
        include_transcript: false,
      }),
      {
        params: { id: meeting.id },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-request-id")).toBe(
      "req_notes_package_contract",
    );
    expect(body).toEqual(
      expect.objectContaining({
        ready: true,
        meetingId: meeting.id,
        title: "Notes Package Contract",
        trigger: "decision_detected",
        destination: "agent_clipboard",
        actionItemCount: 1,
        decisionCount: 1,
        markdown: expect.stringContaining("## Decisions"),
        payload: expect.objectContaining({
          summary: meeting.summary,
          intakeForm: null,
          actionItems: meeting.summary?.actionItems,
          decisions: meeting.summary?.decisions,
        }),
      }),
    );
    expect(typeof body.generatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(body.generatedAt))).toBe(false);
  });

  it("uses JSON error bodies for validation failures", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user_a");

    const response = await POST(
      request({
        destination: "agent_clipboard",
        trigger: "unsupported_trigger",
      }),
      {
        params: { id: meeting.id },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body.error).toContain("Invalid option");
    expect(getMeetingsStore).not.toHaveBeenCalled();
  });
});
