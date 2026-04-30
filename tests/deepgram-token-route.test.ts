import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  checkQuota: vi.fn(),
  getAssemblyAI: vi.fn(),
  getDeepgramClient: vi.fn(),
  createDeepgramStreamingToken: vi.fn(),
  getSettings: vi.fn(),
  getMeetingsStore: vi.fn(),
  withExternalCall: vi.fn(),
}));

vi.mock("@/lib/billing/quota", () => ({
  checkQuota: mocks.checkQuota,
}));

vi.mock("@/lib/assemblyai/client", () => ({
  getAssemblyAI: mocks.getAssemblyAI,
}));

vi.mock("@/lib/deepgram/client", () => ({
  getDeepgramClient: mocks.getDeepgramClient,
  createDeepgramStreamingToken: mocks.createDeepgramStreamingToken,
}));

vi.mock("@/lib/settings", () => ({
  getSettings: mocks.getSettings,
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
    headers: { "content-type": "application/json", "x-request-id": "req_dg" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function allowedQuota() {
  return {
    allowed: true,
    planId: "free",
    monthlyMinutesUsed: 0,
    minuteLimit: 120,
    meetingCount: 0,
    meetingLimit: 25,
  };
}

describe("Deepgram stream token route", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }

    mocks.checkQuota.mockResolvedValue(allowedQuota());
    mocks.getMeetingsStore.mockResolvedValue({
      insert: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      get: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
    });
    mocks.withExternalCall.mockImplementation(async (_meta, fn) => fn());
  });

  it("returns a clear missing DEEPGRAM_API_KEY error for Deepgram models", async () => {
    mocks.getSettings.mockResolvedValue({
      summaryModel: "openai/gpt-5.4-nano",
      batchSpeechModel: "universal-2",
      streamingSpeechModel: "nova-3",
    });
    mocks.getDeepgramClient.mockReturnValue(null);

    const res = await tokenRoute.POST(request());
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body).toMatchObject({
      code: "missing_stt_api_key",
      provider: "deepgram",
      envVar: "DEEPGRAM_API_KEY",
    });
    expect(body.error).toContain("DEEPGRAM_API_KEY");
    expect(mocks.getMeetingsStore).not.toHaveBeenCalled();
  });

  it("returns Deepgram websocket metadata for Nova-3 multilingual", async () => {
    mocks.getSettings.mockResolvedValue({
      summaryModel: "openai/gpt-5.4-nano",
      batchSpeechModel: "universal-2",
      streamingSpeechModel: "nova-3-multilingual",
    });
    mocks.getDeepgramClient.mockReturnValue({});
    mocks.createDeepgramStreamingToken.mockResolvedValue({
      token: "dg_access",
      expiresAt: 1_800_000,
    });

    const res = await tokenRoute.POST(request({ meetingTitle: "Launch sync" }));
    const body = await res.json();
    const wsUrl = new URL(body.wsUrl);

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      provider: "deepgram",
      token: "dg_access",
      sampleRate: 16000,
      speechModel: "nova-3-multilingual",
      listenVersion: "v1",
      protocols: ["token", "dg_access"],
    });
    expect(wsUrl.pathname).toBe("/v1/listen");
    expect(wsUrl.searchParams.get("model")).toBe("nova-3");
    expect(wsUrl.searchParams.get("language")).toBe("multi");
    expect(mocks.createDeepgramStreamingToken).toHaveBeenCalledWith(600);
  });
});
