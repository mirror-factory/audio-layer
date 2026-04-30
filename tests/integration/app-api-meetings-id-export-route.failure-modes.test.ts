import { GET } from "@/app/api/meetings/[id]/export/route";
import { getMeetingsStore, type MeetingsStore } from "@/lib/meetings/store";
import type { Meeting } from "@/lib/meetings/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/meetings/store", () => ({
  getMeetingsStore: vi.fn(),
}));

const minimalMeeting: Meeting = {
  id: "meeting_export_failure_1",
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

function request(url: string) {
  return new Request(url, {
    headers: { "x-request-id": "req_export_failure" },
  }) as Parameters<typeof GET>[0];
}

describe("app/api/meetings/[id]/export/route.ts failure modes", () => {
  beforeEach(() => {
    vi.mocked(getMeetingsStore).mockReset();
  });

  it("returns 400 when the route param id is missing", async () => {
    vi.mocked(getMeetingsStore).mockResolvedValue(storeReturning(minimalMeeting));

    const response = await GET(
      request("http://localhost/api/meetings//export"),
      { params: {} },
    );

    await expect(response.json()).resolves.toEqual({ error: "Missing id" });
    expect(response.status).toBe(400);
    expect(response.headers.get("x-request-id")).toBe("req_export_failure");
    expect(getMeetingsStore).not.toHaveBeenCalled();
  });

  it("returns 400 for unsupported export formats", async () => {
    vi.mocked(getMeetingsStore).mockResolvedValue(storeReturning(minimalMeeting));

    const response = await GET(
      request(
        "http://localhost/api/meetings/meeting_export_failure_1/export?format=docx",
      ),
      { params: { id: minimalMeeting.id } },
    );

    await expect(response.json()).resolves.toEqual({
      error: "Unsupported format: docx. Use 'md' or 'pdf'.",
    });
    expect(response.status).toBe(400);
    expect(response.headers.get("x-request-id")).toBe("req_export_failure");
  });

  it("wraps store failures in the shared route error contract", async () => {
    vi.mocked(getMeetingsStore).mockResolvedValue({
      ...storeReturning(null),
      get: vi.fn().mockRejectedValue(new Error("store unavailable")),
    });

    const response = await GET(
      request("http://localhost/api/meetings/meeting_export_failure_1/export"),
      { params: { id: minimalMeeting.id } },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toBe("req_export_failure");
    expect(body).toMatchObject({
      error: "store unavailable",
      requestId: "req_export_failure",
      traceId: null,
    });
  });
});
