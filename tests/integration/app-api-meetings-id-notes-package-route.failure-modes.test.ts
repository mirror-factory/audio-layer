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

const minimalMeeting: Meeting = {
  id: "meeting_notes_package_failure_1",
  status: "completed",
  title: "Client Debrief",
  text: "Follow up next week.",
  utterances: [],
  durationSeconds: null,
  summary: null,
  intakeForm: null,
  costBreakdown: null,
  error: null,
  createdAt: "2026-04-28T12:00:00.000Z",
  updatedAt: "2026-04-28T12:01:00.000Z",
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
    "http://localhost/api/meetings/meeting_notes_package_failure_1/notes-package",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "req_notes_package_failure",
      },
      body: JSON.stringify(body),
    },
  ) as Parameters<typeof POST>[0];
}

describe("app/api/meetings/[id]/notes-package/route.ts failure modes", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserId).mockReset();
    vi.mocked(getMeetingsStore).mockReset();
  });

  it("returns 401 and skips store lookup when no user is authenticated", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const response = await POST(
      request({
        destination: "agent_clipboard",
      }),
      {
        params: { id: minimalMeeting.id },
      },
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toBe(
      "req_notes_package_failure",
    );
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
    expect(getMeetingsStore).not.toHaveBeenCalled();
  });

  it("returns 400 and skips store lookup when the id route param is missing", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user_a");

    const response = await POST(
      request({
        destination: "agent_clipboard",
      }),
      {
        params: {},
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing id" });
    expect(getMeetingsStore).not.toHaveBeenCalled();
  });

  it("validates request body before loading the meeting", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user_a");

    const response = await POST(
      request({
        destination: "",
        trigger: "manual_push",
      }),
      {
        params: { id: minimalMeeting.id },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Too small");
    expect(getMeetingsStore).not.toHaveBeenCalled();
  });

  it("wraps store failures in the shared route error contract", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user_a");
    vi.mocked(getMeetingsStore).mockResolvedValue({
      ...storeReturning(null),
      get: vi.fn().mockRejectedValue(new Error("store unavailable")),
    });

    const response = await POST(
      request({
        destination: "agent_clipboard",
      }),
      {
        params: { id: minimalMeeting.id },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toBe(
      "req_notes_package_failure",
    );
    expect(body).toMatchObject({
      error: "store unavailable",
      requestId: "req_notes_package_failure",
      traceId: null,
    });
  });
});
