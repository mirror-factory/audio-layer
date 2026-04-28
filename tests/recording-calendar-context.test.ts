import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  cleanRecordingTitle,
  pickRecordingCalendarContext,
} from "@/lib/recording/meeting-context";

const mocks = vi.hoisted(() => ({
  checkQuota: vi.fn(),
  getAssemblyAI: vi.fn(),
  getStreamingSpeechModel: vi.fn(),
  getMeetingsStore: vi.fn(),
  withExternalCall: vi.fn(),
}));

vi.mock("@/lib/billing/quota", () => ({
  checkQuota: mocks.checkQuota,
}));

vi.mock("@/lib/assemblyai/client", () => ({
  getAssemblyAI: mocks.getAssemblyAI,
  getStreamingSpeechModel: mocks.getStreamingSpeechModel,
}));

vi.mock("@/lib/meetings/store", () => ({
  getMeetingsStore: mocks.getMeetingsStore,
}));

vi.mock("@/lib/with-external", () => ({
  withExternalCall: mocks.withExternalCall,
}));

const tokenRoute = await import("@/app/api/transcribe/stream/token/route");

function request(body?: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/transcribe/stream/token", {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": "req_test" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("recording calendar context", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
  });

  it("cleans recording titles for persistence", () => {
    expect(cleanRecordingTitle("  Product   planning   ")).toBe("Product planning");
    expect(cleanRecordingTitle("")).toBeNull();
    expect(cleanRecordingTitle("x".repeat(200))).toHaveLength(120);
  });

  it("picks the first calendar event with a usable title", () => {
    const context = pickRecordingCalendarContext([
      {
        id: "event_1",
        title: "   ",
        startsAt: "2026-04-27T16:00:00.000Z",
      },
      {
        id: "event_2",
        title: "Customer discovery",
        startsAt: "2026-04-27T17:00:00.000Z",
        location: "Zoom",
      },
    ], "google");

    expect(context).toMatchObject({
      meetingTitle: "Customer discovery",
      calendarEventId: "event_2",
      provider: "google",
      location: "Zoom",
    });
  });

  it("uses the calendar title when creating the streaming meeting row", async () => {
    const insert = vi.fn().mockResolvedValue({});
    mocks.checkQuota.mockResolvedValue({
      allowed: true,
      planId: "free",
      monthlyMinutesUsed: 0,
      minuteLimit: 120,
      meetingCount: 0,
      meetingLimit: 25,
    });
    mocks.getMeetingsStore.mockResolvedValue({
      insert,
      update: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
    });
    mocks.getAssemblyAI.mockReturnValue({
      streaming: {
        createTemporaryToken: vi.fn().mockResolvedValue("token_123"),
      },
    });
    mocks.withExternalCall.mockImplementation(async (_meta, fn) => fn());
    mocks.getStreamingSpeechModel.mockResolvedValue("universal-streaming-multilingual");

    const res = await tokenRoute.POST(request({
      meetingTitle: "  Customer discovery   ",
      calendarEventId: "event_123",
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      token: "token_123",
      sampleRate: 16000,
      speechModel: "universal-streaming-multilingual",
    });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      status: "processing",
      title: "Customer discovery",
    }));
  });
});
