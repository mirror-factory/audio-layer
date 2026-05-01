/**
 * API behavior tests for /api/transcribe and /api/transcribe/[id] and
 * /api/transcribe/stream/*.
 *
 * Per PROD-321 / V1_PLAN.md §5:
 *   - /api/transcribe: missing audio, too-large audio, quota reached, mocked
 *     provider success.
 *   - /api/transcribe/[id]: processing, completed, provider error,
 *     summary generation error.
 *   - /api/transcribe/stream/*: token issue, autosave, finalize, invalid token.
 *   - All assertions include x-request-id.
 *   - Vendor (AssemblyAI) is mocked.
 *
 * These tests invoke the route exports directly with NextRequest, similar to
 * tests/api-route-behavior.test.ts. The AssemblyAI SDK is mocked at the
 * module boundary (lib/assemblyai/client) so no live HTTP is performed.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getAssemblyAI: vi.fn(),
  getBatchSpeechModelsFromSettings: vi.fn(),
  checkQuota: vi.fn(),
  getMeetingsStore: vi.fn(),
  getCurrentUserId: vi.fn(),
  summarizeMeeting: vi.fn(),
  extractIntakeForm: vi.fn(),
  embedMeeting: vi.fn(),
  flushLangfuse: vi.fn(),
  getSettings: vi.fn(),
  resolveRuntimeStreamingOption: vi.fn(),
  runtimeProviderForOption: vi.fn(),
  getDeepgramClient: vi.fn(),
  createDeepgramStreamingToken: vi.fn(),
  getDeepgramStreamingConfig: vi.fn(),
  buildDeepgramListenUrl: vi.fn(),
  fireWebhooks: vi.fn(),
}));

vi.mock("@/lib/assemblyai/client", () => ({
  getAssemblyAI: mocks.getAssemblyAI,
  getBatchSpeechModelsFromSettings: mocks.getBatchSpeechModelsFromSettings,
}));

vi.mock("@/lib/billing/quota", () => ({
  checkQuota: mocks.checkQuota,
}));

vi.mock("@/lib/meetings/store", () => ({
  getMeetingsStore: mocks.getMeetingsStore,
}));

vi.mock("@/lib/supabase/user", () => ({
  getCurrentUserId: mocks.getCurrentUserId,
  getSupabaseUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/assemblyai/summary", () => ({
  summarizeMeeting: mocks.summarizeMeeting,
}));

vi.mock("@/lib/assemblyai/intake", () => ({
  extractIntakeForm: mocks.extractIntakeForm,
}));

vi.mock("@/lib/embeddings/embed-meeting", () => ({
  embedMeeting: mocks.embedMeeting,
}));

vi.mock("@/lib/langfuse-flush", () => ({
  flushLangfuse: mocks.flushLangfuse,
}));

vi.mock("@/lib/settings", () => ({
  getSettings: mocks.getSettings,
}));

vi.mock("@/lib/recording/transcription-provider", () => ({
  resolveRuntimeStreamingOption: mocks.resolveRuntimeStreamingOption,
  runtimeProviderForOption: mocks.runtimeProviderForOption,
  providerEnvVarName: (p: string) =>
    p === "deepgram" ? "DEEPGRAM_API_KEY" : "ASSEMBLYAI_API_KEY",
}));

vi.mock("@/lib/deepgram/client", () => ({
  getDeepgramClient: mocks.getDeepgramClient,
  createDeepgramStreamingToken: mocks.createDeepgramStreamingToken,
}));

vi.mock("@/lib/deepgram/options", () => ({
  getDeepgramStreamingConfig: mocks.getDeepgramStreamingConfig,
  buildDeepgramListenUrl: mocks.buildDeepgramListenUrl,
}));

vi.mock("@/lib/webhooks/fire", () => ({
  fireWebhooks: mocks.fireWebhooks,
}));

// Stub `next/server`'s `after` so background tasks don't leak between tests.
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: (_fn: () => void | Promise<void>) => {
      void _fn;
    },
  };
});

const transcribeRoute = await import("@/app/api/transcribe/route");
const transcribeIdRoute = await import("@/app/api/transcribe/[id]/route");
const tokenRoute = await import("@/app/api/transcribe/stream/token/route");
const autosaveRoute = await import("@/app/api/transcribe/stream/autosave/route");
const finalizeRoute = await import("@/app/api/transcribe/stream/finalize/route");

function multipartRequest(form: FormData): NextRequest {
  return new NextRequest("http://localhost:3000/api/transcribe", {
    method: "POST",
    headers: { "x-request-id": "req_test" },
    body: form,
  });
}

function jsonRequest(path: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: { "content-type": "application/json", "x-request-id": "req_test" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function allowedQuota() {
  return {
    allowed: true,
    meetingCount: 0,
    monthlyMeetingCount: 0,
    monthlyMinutesUsed: 0,
    limit: Infinity,
    meetingLimit: null,
    meetingLimitPeriod: "monthly" as const,
    minuteLimit: null,
    planId: "free",
    isSubscriber: false,
  };
}

function blockedQuota() {
  return {
    allowed: false,
    meetingCount: 25,
    monthlyMeetingCount: 25,
    monthlyMinutesUsed: 0,
    limit: 25,
    meetingLimit: 25,
    meetingLimitPeriod: "lifetime" as const,
    minuteLimit: null,
    planId: "free",
    isSubscriber: false,
    reason: "meeting_limit" as const,
  };
}

function meetingsStore(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    insert: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("/api/transcribe (batch)", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.checkQuota.mockResolvedValue(allowedQuota());
    mocks.getCurrentUserId.mockResolvedValue("user_a");
    mocks.getBatchSpeechModelsFromSettings.mockResolvedValue(["universal-3-pro"]);
    mocks.summarizeMeeting.mockResolvedValue(null);
    mocks.extractIntakeForm.mockResolvedValue(null);
    mocks.embedMeeting.mockResolvedValue({ chunksEmbedded: 0, totalTokens: 0, costUsd: 0 });
    mocks.flushLangfuse.mockResolvedValue(undefined);
    mocks.getSettings.mockResolvedValue({
      summaryModel: "openai/gpt-5.4-nano",
      batchSpeechModel: "universal-3-pro",
      streamingSpeechModel: "universal-streaming",
    });
    mocks.resolveRuntimeStreamingOption.mockReturnValue({
      provider: "assemblyai",
      model: "universal-streaming",
      mode: "streaming",
      runtimeStatus: "implemented",
    });
    mocks.runtimeProviderForOption.mockReturnValue("assemblyai");
  });

  it("returns 400 when audio is missing", async () => {
    mocks.getMeetingsStore.mockResolvedValue(meetingsStore());
    mocks.getAssemblyAI.mockReturnValue({
      files: { upload: vi.fn() },
      transcripts: { submit: vi.fn() },
    });

    const form = new FormData();
    const res = await transcribeRoute.POST(multipartRequest(form));

    expect(res.status).toBe(400);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    await expect(res.json()).resolves.toMatchObject({ error: "Missing or empty audio file" });
    expect(mocks.checkQuota).not.toHaveBeenCalled();
  });

  it("returns 413 when audio exceeds the 100MB limit", async () => {
    mocks.getMeetingsStore.mockResolvedValue(meetingsStore());

    // Spoof a Blob whose .size getter reports >100MB without allocating
    // those bytes. The route only reads .size and .arrayBuffer(); we expect
    // execution to short-circuit at the size check before arrayBuffer().
    const huge: Blob = Object.create(Blob.prototype);
    Object.defineProperty(huge, "size", { value: 100 * 1024 * 1024 + 1 });
    Object.defineProperty(huge, "type", { value: "audio/wav" });
    Object.defineProperty(huge, "arrayBuffer", {
      value: () => Promise.resolve(new ArrayBuffer(0)),
    });

    // Construct a fake NextRequest where formData() returns our spoofed blob
    // directly (bypasses real multipart serialization which would read
    // real bytes from the blob).
    const fakeForm = {
      get(name: string) {
        return name === "audio" ? (huge as unknown as Blob) : null;
      },
    };
    const req = new NextRequest("http://localhost:3000/api/transcribe", {
      method: "POST",
      headers: { "x-request-id": "req_test" },
    });
    Object.defineProperty(req, "formData", {
      value: () => Promise.resolve(fakeForm as unknown as FormData),
    });

    const res = await transcribeRoute.POST(req);

    expect(res.status).toBe(413);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    await expect(res.json()).resolves.toMatchObject({ error: "File exceeds 100MB limit" });
  });

  it("returns 402 with free_limit_reached code when quota is exhausted", async () => {
    mocks.checkQuota.mockResolvedValue(blockedQuota());
    mocks.getMeetingsStore.mockResolvedValue(meetingsStore());

    const form = new FormData();
    form.append("audio", new Blob(["audio-bytes"]), "clip.wav");

    const res = await transcribeRoute.POST(multipartRequest(form));
    const body = await res.json();

    // The route returns 402 (payment required / free_limit_reached) for
    // quota exhaustion, see app/api/transcribe/route.ts.
    expect(res.status).toBe(402);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    expect(body).toMatchObject({
      code: "free_limit_reached",
      upgradeUrl: "/pricing",
    });
  });

  it("returns 202 with provider transcript id on a mocked provider success", async () => {
    const insert = vi.fn().mockResolvedValue({});
    mocks.getMeetingsStore.mockResolvedValue(meetingsStore({ insert }));
    const upload = vi.fn().mockResolvedValue("https://cdn.assemblyai.com/upload/abc");
    const submit = vi
      .fn()
      .mockResolvedValue({ id: "transcript_xyz", status: "queued" });
    mocks.getAssemblyAI.mockReturnValue({
      files: { upload },
      transcripts: { submit },
    });

    const form = new FormData();
    form.append("audio", new Blob(["audio-bytes"]), "clip.wav");

    const res = await transcribeRoute.POST(multipartRequest(form));
    const body = await res.json();

    expect(res.status).toBe(202);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    expect(body).toMatchObject({ id: "transcript_xyz", status: "processing" });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith({ id: "transcript_xyz", status: "processing" });
  });

  it("returns 502 when AssemblyAI is not configured", async () => {
    mocks.getMeetingsStore.mockResolvedValue(meetingsStore());
    mocks.getAssemblyAI.mockReturnValue(null);

    const form = new FormData();
    form.append("audio", new Blob(["audio-bytes"]), "clip.wav");

    const res = await transcribeRoute.POST(multipartRequest(form));

    expect(res.status).toBe(502);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    await expect(res.json()).resolves.toMatchObject({
      error: "AssemblyAI is not configured",
    });
  });
});

describe("/api/transcribe/[id]", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.getCurrentUserId.mockResolvedValue("user_a");
    mocks.embedMeeting.mockResolvedValue({ chunksEmbedded: 0, totalTokens: 0, costUsd: 0 });
    mocks.flushLangfuse.mockResolvedValue(undefined);
    mocks.getSettings.mockResolvedValue({
      summaryModel: "openai/gpt-5.4-nano",
      batchSpeechModel: "universal-3-pro",
      streamingSpeechModel: "universal-streaming",
    });
  });

  function ctx() {
    return {
      requestId: "req_test",
      startedAt: Date.now(),
      params: Promise.resolve({ id: "transcript_xyz" }),
    };
  }

  it("returns the processing state without calling summary when transcript is still queued", async () => {
    const update = vi.fn().mockResolvedValue({});
    mocks.getMeetingsStore.mockResolvedValue(
      meetingsStore({ get: vi.fn().mockResolvedValue(null), update }),
    );
    mocks.getAssemblyAI.mockReturnValue({
      transcripts: {
        get: vi.fn().mockResolvedValue({ id: "transcript_xyz", status: "queued" }),
      },
    });
    mocks.summarizeMeeting.mockResolvedValue(null);
    mocks.extractIntakeForm.mockResolvedValue(null);

    const req = jsonRequest("/api/transcribe/transcript_xyz", "GET");
    const res = await transcribeIdRoute.GET(req, ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    expect(body).toMatchObject({ id: "transcript_xyz", status: "processing" });
    expect(mocks.summarizeMeeting).not.toHaveBeenCalled();
  });

  it("returns the cached completed state directly from the store", async () => {
    mocks.getMeetingsStore.mockResolvedValue(
      meetingsStore({
        get: vi.fn().mockResolvedValue({
          id: "transcript_xyz",
          status: "completed",
          text: "hi",
          utterances: [],
          durationSeconds: 12,
          summary: { title: "T", summary: "S", keyPoints: [], actionItems: [], decisions: [], participants: [] },
          intakeForm: null,
          costBreakdown: null,
        }),
      }),
    );
    // AssemblyAI must not be called when we have a cached completion.
    mocks.getAssemblyAI.mockReturnValue({
      transcripts: { get: vi.fn() },
    });

    const res = await transcribeIdRoute.GET(jsonRequest("/api/transcribe/transcript_xyz", "GET"), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    expect(body).toMatchObject({ id: "transcript_xyz", status: "completed" });
  });

  it("returns 404 when AssemblyAI reports the transcript does not exist", async () => {
    mocks.getMeetingsStore.mockResolvedValue(meetingsStore());
    const providerErr = Object.assign(new Error("Not found"), { status: 404 });
    mocks.getAssemblyAI.mockReturnValue({
      transcripts: { get: vi.fn().mockRejectedValue(providerErr) },
    });

    const res = await transcribeIdRoute.GET(jsonRequest("/api/transcribe/missing", "GET"), {
      requestId: "req_test",
      startedAt: Date.now(),
      params: Promise.resolve({ id: "missing" }),
    });

    expect(res.status).toBe(404);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    await expect(res.json()).resolves.toMatchObject({ error: "Transcript not found" });
  });

  it("returns 200 with summary=null when summary generation rejects (non-fatal)", async () => {
    const update = vi.fn().mockResolvedValue({});
    mocks.getMeetingsStore.mockResolvedValue(
      meetingsStore({ get: vi.fn().mockResolvedValue(null), update }),
    );
    mocks.getAssemblyAI.mockReturnValue({
      transcripts: {
        get: vi.fn().mockResolvedValue({
          id: "transcript_xyz",
          status: "completed",
          text: "Some transcript",
          utterances: [],
          audio_duration: 60,
          speech_model: "universal-3-pro",
        }),
      },
    });
    mocks.summarizeMeeting.mockRejectedValue(new Error("LLM exploded"));
    mocks.extractIntakeForm.mockRejectedValue(new Error("intake exploded"));

    const res = await transcribeIdRoute.GET(jsonRequest("/api/transcribe/transcript_xyz", "GET"), ctx());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    expect(body).toMatchObject({
      id: "transcript_xyz",
      status: "completed",
      summary: null,
      intakeForm: null,
    });
    // Persisted with completed status even when summary failed
    expect(update).toHaveBeenCalledWith(
      "transcript_xyz",
      expect.objectContaining({ status: "completed" }),
    );
  });
});

describe("/api/transcribe/stream/token", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.checkQuota.mockResolvedValue(allowedQuota());
    mocks.getCurrentUserId.mockResolvedValue("user_a");
    mocks.getSettings.mockResolvedValue({
      summaryModel: "openai/gpt-5.4-nano",
      batchSpeechModel: "universal-3-pro",
      streamingSpeechModel: "universal-streaming",
    });
    mocks.resolveRuntimeStreamingOption.mockReturnValue({
      provider: "assemblyai",
      model: "universal-streaming",
      mode: "streaming",
      runtimeStatus: "implemented",
    });
    mocks.runtimeProviderForOption.mockReturnValue("assemblyai");
  });

  it("returns 502 with missing_stt_api_key when AssemblyAI client is unavailable", async () => {
    mocks.getMeetingsStore.mockResolvedValue(meetingsStore());
    mocks.getAssemblyAI.mockReturnValue(null);

    const res = await tokenRoute.POST(jsonRequest("/api/transcribe/stream/token", "POST", {}));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    expect(body).toMatchObject({
      code: "missing_stt_api_key",
      provider: "assemblyai",
      envVar: "ASSEMBLYAI_API_KEY",
    });
  });

  it("returns 402 with free_limit_reached when quota is exhausted before vendor token mint", async () => {
    mocks.checkQuota.mockResolvedValue(blockedQuota());
    mocks.getMeetingsStore.mockResolvedValue(meetingsStore());
    const createTemporaryToken = vi.fn();
    mocks.getAssemblyAI.mockReturnValue({
      streaming: { createTemporaryToken },
    });

    const res = await tokenRoute.POST(jsonRequest("/api/transcribe/stream/token", "POST", {}));

    expect(res.status).toBe(402);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    await expect(res.json()).resolves.toMatchObject({ code: "free_limit_reached" });
    expect(createTemporaryToken).not.toHaveBeenCalled();
  });

  it("returns 502 when token issue rejects from the provider (token issue failure)", async () => {
    const update = vi.fn().mockResolvedValue({});
    mocks.getMeetingsStore.mockResolvedValue(meetingsStore({ update }));
    mocks.getAssemblyAI.mockReturnValue({
      streaming: {
        createTemporaryToken: vi.fn().mockRejectedValue(new Error("provider down")),
      },
    });

    const res = await tokenRoute.POST(jsonRequest("/api/transcribe/stream/token", "POST", {}));

    expect(res.status).toBe(502);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    await expect(res.json()).resolves.toMatchObject({
      error: "Unable to create streaming token",
    });
    // Meeting row marked as error to avoid orphan rows
    expect(update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: "error" }),
    );
  });

  it("returns a token + meetingId on a successful AssemblyAI token issue", async () => {
    const insert = vi.fn().mockResolvedValue({});
    mocks.getMeetingsStore.mockResolvedValue(meetingsStore({ insert }));
    const createTemporaryToken = vi.fn().mockResolvedValue("tok_live_123");
    mocks.getAssemblyAI.mockReturnValue({
      streaming: { createTemporaryToken },
    });

    const res = await tokenRoute.POST(
      jsonRequest("/api/transcribe/stream/token", "POST", { meetingTitle: "Standup" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    expect(body).toMatchObject({
      provider: "assemblyai",
      token: "tok_live_123",
      sampleRate: 16000,
      speechModel: "universal-streaming",
    });
    expect(typeof body.meetingId).toBe("string");
    expect(body.wsUrl).toContain("token=tok_live_123");
    expect(insert).toHaveBeenCalledTimes(1);
  });
});

describe("/api/transcribe/stream/autosave", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
  });

  it("returns 400 for an invalid body (autosave reject)", async () => {
    mocks.getMeetingsStore.mockResolvedValue(meetingsStore());
    const res = await autosaveRoute.POST(
      jsonRequest("/api/transcribe/stream/autosave", "POST", { meetingId: "" }),
    );

    expect(res.status).toBe(400);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    await expect(res.json()).resolves.toMatchObject({ error: "Invalid body" });
  });

  it("persists autosave payloads and reports the utterance count", async () => {
    const update = vi.fn().mockResolvedValue({});
    mocks.getMeetingsStore.mockResolvedValue(meetingsStore({ update }));

    const body = {
      meetingId: "meeting_1",
      meetingTitle: "Planning",
      text: "partial",
      utterances: [
        { speaker: "Alex", text: "hi", start: 0, end: 1, confidence: 0.9 },
      ],
      durationSeconds: 5,
    };
    const res = await autosaveRoute.POST(jsonRequest("/api/transcribe/stream/autosave", "POST", body));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    expect(json).toMatchObject({ saved: true, utteranceCount: 1 });
    expect(update).toHaveBeenCalledWith(
      "meeting_1",
      expect.objectContaining({ status: "processing", text: "partial" }),
    );
  });
});

describe("/api/transcribe/stream/finalize", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.getCurrentUserId.mockResolvedValue("user_a");
    mocks.getSettings.mockResolvedValue({
      summaryModel: "openai/gpt-5.4-nano",
      batchSpeechModel: "universal-3-pro",
      streamingSpeechModel: "universal-streaming",
    });
    mocks.summarizeMeeting.mockResolvedValue(null);
    mocks.extractIntakeForm.mockResolvedValue(null);
    mocks.embedMeeting.mockResolvedValue({ chunksEmbedded: 0, totalTokens: 0, costUsd: 0 });
    mocks.flushLangfuse.mockResolvedValue(undefined);
    mocks.fireWebhooks.mockResolvedValue(undefined);
  });

  it("returns 400 when finalize body is malformed (invalid token / shape)", async () => {
    mocks.getMeetingsStore.mockResolvedValue(meetingsStore());

    const res = await finalizeRoute.POST(
      jsonRequest("/api/transcribe/stream/finalize", "POST", { meetingId: "" }),
    );

    expect(res.status).toBe(400);
    expect(res.headers.get("x-request-id")).toBe("req_test");
  });

  it("finalizes the meeting and writes a completed row", async () => {
    const update = vi.fn().mockResolvedValue({
      id: "meeting_1",
      status: "completed",
      title: null,
      text: "transcript",
      utterances: [],
      durationSeconds: 30,
      summary: null,
      intakeForm: null,
      costBreakdown: null,
      error: null,
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z",
    });
    mocks.getMeetingsStore.mockResolvedValue(meetingsStore({ update }));

    const res = await finalizeRoute.POST(
      jsonRequest("/api/transcribe/stream/finalize", "POST", {
        meetingId: "meeting_1",
        text: "transcript",
        utterances: [],
        durationSeconds: 30,
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    expect(body).toMatchObject({
      id: "meeting_1",
      status: "completed",
      text: "transcript",
    });
    expect(update).toHaveBeenCalledWith(
      "meeting_1",
      expect.objectContaining({ status: "completed" }),
    );
  });
});
