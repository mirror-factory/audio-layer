import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  getSupabaseUser: vi.fn(),
  searchMeetings: vi.fn(),
  getSupabaseServer: vi.fn(),
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  getMeetingsStore: vi.fn(),
  authMode: vi.fn(),
  resolveModel: vi.fn(),
}));

vi.mock("@/lib/supabase/user", () => ({
  getCurrentUserId: mocks.getCurrentUserId,
  getSupabaseUser: mocks.getSupabaseUser,
}));

vi.mock("@/lib/embeddings/search", () => ({
  searchMeetings: mocks.searchMeetings,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: mocks.getSupabaseServer,
}));

vi.mock("@/lib/settings", () => ({
  getSettings: mocks.getSettings,
  saveSettings: mocks.saveSettings,
}));

vi.mock("@/lib/meetings/store", () => ({
  getMeetingsStore: mocks.getMeetingsStore,
}));

vi.mock("@/lib/ai/model-router", () => ({
  authMode: mocks.authMode,
  resolveModel: mocks.resolveModel,
}));

const searchRoute = await import("@/app/api/search/route");
const calendarRoute = await import("@/app/api/calendar/upcoming/route");
const calendarConnectRoute = await import("@/app/api/calendar/connect/[provider]/route");
const calendarDisconnectRoute = await import("@/app/api/calendar/disconnect/[provider]/route");
const settingsRoute = await import("@/app/api/settings/route");
const meetingRoute = await import("@/app/api/meetings/[id]/route");
const notesPackageRoute = await import("@/app/api/meetings/[id]/notes-package/route");
const chatRoute = await import("@/app/api/chat/route");
const sendEmailRoute = await import("@/app/api/auth/send-email/route");
const checkoutRoute = await import("@/app/api/stripe/checkout/route");
const checkoutUrls = await import("@/lib/stripe/checkout-urls");
const webhooksRoute = await import("@/app/api/webhooks/route");
const webhookDeliveriesRoute = await import("@/app/api/webhooks/deliveries/route");

function jsonRequest(path: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: { "content-type": "application/json", "x-request-id": "req_test" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function routeCtx(provider: string) {
  return { params: Promise.resolve({ provider }) };
}

describe("high-risk API route behavior", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
    mocks.authMode.mockReturnValue("unconfigured");
  });

  it("POST /api/search returns 401 when no user is authenticated", async () => {
    mocks.getCurrentUserId.mockResolvedValue(null);

    const res = await searchRoute.POST(jsonRequest("/api/search", "POST", { query: "pricing" }));

    expect(res.status).toBe(401);
    expect(res.headers.get("x-request-id")).toBe("req_test");
    await expect(res.json()).resolves.toMatchObject({ error: "Authentication required" });
    expect(mocks.searchMeetings).not.toHaveBeenCalled();
  });

  it("POST /api/search validates request body before searching", async () => {
    mocks.getCurrentUserId.mockResolvedValue("user_a");

    const res = await searchRoute.POST(jsonRequest("/api/search", "POST", { query: "" }));

    expect(res.status).toBe(400);
    expect(mocks.searchMeetings).not.toHaveBeenCalled();
  });

  it("POST /api/search returns semantic results scoped to the current user", async () => {
    mocks.getCurrentUserId.mockResolvedValue("user_a");
    mocks.searchMeetings.mockResolvedValue([
      {
        meetingId: "meeting_1",
        chunkText: "Budget was approved",
        chunkType: "summary",
        similarity: 0.92,
        meetingTitle: "Pricing Review",
        meetingDate: "2026-04-24T00:00:00.000Z",
      },
    ]);

    const res = await searchRoute.POST(jsonRequest("/api/search", "POST", { query: "budget", limit: 3 }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mocks.searchMeetings).toHaveBeenCalledWith("budget", "user_a", 3);
    expect(body).toMatchObject({ mode: "semantic", results: [{ meetingId: "meeting_1" }] });
  });

  it("GET /api/calendar/upcoming returns a disconnected overview without auth", async () => {
    mocks.getCurrentUserId.mockResolvedValue(null);
    mocks.getSupabaseUser.mockResolvedValue(null);

    const res = await calendarRoute.GET(jsonRequest("/api/calendar/upcoming", "GET"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      connected: false,
      provider: null,
      items: [],
    });
  });

  it("GET /api/calendar/upcoming reports connected calendar metadata", async () => {
    mocks.getCurrentUserId.mockResolvedValue("user_a");
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            provider: "google",
            provider_account_email: "person@example.com",
            status: "connected",
            updated_at: "2026-04-27T00:00:00.000Z",
          },
        ],
        error: null,
      }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    mocks.getSupabaseUser.mockResolvedValue({
      from: vi.fn(() => query),
    });

    const res = await calendarRoute.GET(jsonRequest("/api/calendar/upcoming?limit=3", "GET"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      connected: true,
      provider: "google",
      accountEmail: "person@example.com",
      items: [],
    });
  });

  it("GET /api/calendar/connect/[provider] redirects to setup when credentials are missing", async () => {
    mocks.getCurrentUserId.mockResolvedValue("user_a");

    const res = await calendarConnectRoute.GET(
      jsonRequest("/api/calendar/connect/google", "GET"),
      routeCtx("google"),
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/settings?calendar=setup_required");
  });

  it("POST /api/calendar/disconnect/[provider] requires an authenticated user", async () => {
    mocks.getCurrentUserId.mockResolvedValue(null);

    const res = await calendarDisconnectRoute.POST(
      jsonRequest("/api/calendar/disconnect/google", "POST"),
      routeCtx("google"),
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: "Authentication required" });
  });

  it("GET /api/settings returns persisted model settings", async () => {
    mocks.getSettings.mockResolvedValue({
      summaryModel: "openai/gpt-5.4-nano",
      batchSpeechModel: "universal-2",
      streamingSpeechModel: "universal-streaming-multilingual",
    });

    const res = await settingsRoute.GET(jsonRequest("/api/settings", "GET"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ batchSpeechModel: "universal-2" });
  });

  it("PUT /api/settings persists partial settings and returns the merged result", async () => {
    mocks.saveSettings.mockResolvedValue({
      summaryModel: "openai/gpt-5.4-nano",
      batchSpeechModel: "universal-3-pro",
      streamingSpeechModel: "universal-streaming-multilingual",
    });

    const res = await settingsRoute.PUT(jsonRequest("/api/settings", "PUT", { batchSpeechModel: "universal-3-pro" }));

    expect(res.status).toBe(200);
    expect(mocks.saveSettings).toHaveBeenCalledWith({ batchSpeechModel: "universal-3-pro" });
    await expect(res.json()).resolves.toMatchObject({ batchSpeechModel: "universal-3-pro" });
  });

  it("PUT /api/settings returns 400 for malformed JSON", async () => {
    const res = await settingsRoute.PUT(jsonRequest("/api/settings", "PUT"));

    expect(res.status).toBe(400);
    expect(mocks.saveSettings).not.toHaveBeenCalled();
  });

  it("POST /api/chat rejects an empty message list before calling a model", async () => {
    const res = await chatRoute.POST(jsonRequest("/api/chat", "POST", { messages: [] }));

    expect(res.status).toBe(400);
  });

  it("POST /api/chat requires authentication for valid chat requests", async () => {
    mocks.getCurrentUserId.mockResolvedValue(null);

    const res = await chatRoute.POST(jsonRequest("/api/chat", "POST", {
      messages: [
        {
          id: "msg_1",
          role: "user",
          parts: [{ type: "text", text: "What were the action items?" }],
        },
      ],
    }));

    expect(res.status).toBe(401);
    expect(mocks.getMeetingsStore).not.toHaveBeenCalled();
  });

  it("POST /api/chat returns 404 when meeting-scoped chat points at a missing meeting", async () => {
    mocks.getCurrentUserId.mockResolvedValue("user_a");
    mocks.getMeetingsStore.mockResolvedValue({
      insert: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      get: vi.fn().mockResolvedValue(null),
    });

    const res = await chatRoute.POST(jsonRequest("/api/chat", "POST", {
      meetingId: "meeting_missing",
      messages: [
        {
          id: "msg_1",
          role: "user",
          parts: [{ type: "text", text: "What happened in this meeting?" }],
        },
      ],
    }));

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: "Meeting not found" });
  });

  it("POST /api/chat returns a local grounded meeting answer when no AI model is configured", async () => {
    mocks.getCurrentUserId.mockResolvedValue("user_a");
    mocks.getMeetingsStore.mockResolvedValue({
      insert: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      get: vi.fn().mockResolvedValue({
        id: "meeting_1",
        title: "Launch review",
        status: "completed",
        text: "We approved pricing and Alex will send the launch timeline.",
        utterances: [
          {
            speaker: "Alex",
            text: "We approved pricing and I will send the launch timeline tomorrow.",
            start: 0,
            end: 2000,
            confidence: 0.96,
          },
        ],
        durationSeconds: 600,
        summary: {
          title: "Launch review",
          summary: "The team reviewed launch readiness and confirmed pricing.",
          keyPoints: ["Pricing was approved"],
          actionItems: [
            { assignee: "Alex", task: "Send the launch timeline", dueDate: null },
          ],
          decisions: ["Pricing was approved"],
          participants: ["Alex"],
        },
        intakeForm: null,
        costBreakdown: null,
        error: null,
        createdAt: "2026-04-24T00:00:00.000Z",
        updatedAt: "2026-04-24T00:00:00.000Z",
      }),
    });

    const res = await chatRoute.POST(jsonRequest("/api/chat", "POST", {
      meetingId: "meeting_1",
      messages: [
        {
          id: "msg_1",
          role: "user",
          parts: [{ type: "text", text: "What were the action items?" }],
        },
      ],
    }));
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("x-layer-one-chat-mode")).toBe("local");
    expect(body).toContain("Action Items");
    expect(body).toContain("Send the launch timeline");
    expect(mocks.resolveModel).not.toHaveBeenCalled();
  });

  it("POST /api/auth/send-email rejects non-hook payloads before email delivery", async () => {
    const res = await sendEmailRoute.POST(jsonRequest("/api/auth/send-email", "POST", { email: "person@example.com" }));

    expect(res.status).toBe(400);
  });

  it("POST /api/stripe/checkout rejects malformed JSON before Stripe calls", async () => {
    const res = await checkoutRoute.POST(jsonRequest("/api/stripe/checkout", "POST"));

    expect(res.status).toBe(400);
  });

  it("POST /api/stripe/checkout builds local redirects from the current request origin", () => {
    const req = new NextRequest("http://localhost:3001/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "req_test" },
      body: JSON.stringify({ tier: "core" }),
    });

    expect(checkoutUrls.checkoutRedirectUrls(req)).toEqual({
      successUrl: "http://localhost:3001/?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "http://localhost:3001/pricing?checkout=canceled",
    });
  });

  it("GET /api/meetings/[id] returns 400 when the route param is missing", async () => {
    const res = await meetingRoute.GET(jsonRequest("/api/meetings/missing", "GET"), {
      requestId: "req_test",
      startedAt: Date.now(),
      params: {},
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "Missing id" });
  });

  it("GET /api/meetings/[id] returns 404 when store lookup misses", async () => {
    mocks.getMeetingsStore.mockResolvedValue({
      insert: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      get: vi.fn().mockResolvedValue(null),
    });

    const res = await meetingRoute.GET(jsonRequest("/api/meetings/missing", "GET"), {
      requestId: "req_test",
      startedAt: Date.now(),
      params: { id: "meeting_missing" },
    });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: "Meeting not found" });
  });

  it("DELETE /api/meetings/[id] deletes an empty zero-minute recording", async () => {
    const deleteMeeting = vi.fn().mockResolvedValue(true);
    mocks.getMeetingsStore.mockResolvedValue({
      insert: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      get: vi.fn().mockResolvedValue({
        id: "empty_1",
        title: "Untitled recording",
        status: "completed",
        text: null,
        utterances: [],
        durationSeconds: 12,
        summary: null,
        intakeForm: null,
        costBreakdown: null,
        error: null,
        createdAt: "2026-04-27T00:00:00.000Z",
        updatedAt: "2026-04-27T00:00:00.000Z",
      }),
      delete: deleteMeeting,
    });

    const res = await meetingRoute.DELETE(jsonRequest("/api/meetings/empty_1", "DELETE"), {
      requestId: "req_test",
      startedAt: Date.now(),
      params: { id: "empty_1" },
    });

    expect(res.status).toBe(200);
    expect(deleteMeeting).toHaveBeenCalledWith("empty_1");
    await expect(res.json()).resolves.toMatchObject({ ok: true });
  });

  it("DELETE /api/meetings/[id] refuses recordings that contain content", async () => {
    const deleteMeeting = vi.fn();
    mocks.getMeetingsStore.mockResolvedValue({
      insert: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      get: vi.fn().mockResolvedValue({
        id: "meeting_1",
        title: "Customer call",
        status: "completed",
        text: "Actual transcript",
        utterances: [],
        durationSeconds: 60,
        summary: null,
        intakeForm: null,
        costBreakdown: null,
        error: null,
        createdAt: "2026-04-27T00:00:00.000Z",
        updatedAt: "2026-04-27T00:00:00.000Z",
      }),
      delete: deleteMeeting,
    });

    const res = await meetingRoute.DELETE(jsonRequest("/api/meetings/meeting_1", "DELETE"), {
      requestId: "req_test",
      startedAt: Date.now(),
      params: { id: "meeting_1" },
    });

    expect(res.status).toBe(409);
    expect(deleteMeeting).not.toHaveBeenCalled();
  });

  it("POST /api/meetings/[id]/notes-package requires an authenticated user", async () => {
    mocks.getCurrentUserId.mockResolvedValue(null);

    const res = await notesPackageRoute.POST(
      jsonRequest("/api/meetings/meeting_1/notes-package", "POST", {
        destination: "agent_clipboard",
      }),
      {
        requestId: "req_test",
        startedAt: Date.now(),
        params: { id: "meeting_1" },
      },
    );

    expect(res.status).toBe(401);
    expect(mocks.getMeetingsStore).not.toHaveBeenCalled();
  });

  it("POST /api/meetings/[id]/notes-package validates body before store lookup", async () => {
    mocks.getCurrentUserId.mockResolvedValue("user_a");

    const res = await notesPackageRoute.POST(
      jsonRequest("/api/meetings/meeting_1/notes-package", "POST", {
        destination: "",
      }),
      {
        requestId: "req_test",
        startedAt: Date.now(),
        params: { id: "meeting_1" },
      },
    );

    expect(res.status).toBe(400);
    expect(mocks.getMeetingsStore).not.toHaveBeenCalled();
  });

  it("POST /api/meetings/[id]/notes-package returns a markdown package", async () => {
    mocks.getCurrentUserId.mockResolvedValue("user_a");
    mocks.getMeetingsStore.mockResolvedValue({
      insert: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      get: vi.fn().mockResolvedValue({
        id: "meeting_1",
        title: "Launch review",
        status: "completed",
        text: "Transcript text",
        utterances: [],
        durationSeconds: 1200,
        summary: {
          title: "Launch review",
          summary: "The team reviewed launch readiness.",
          keyPoints: ["Pricing approved"],
          actionItems: [
            { assignee: "Alex", task: "Send timeline", dueDate: null },
          ],
          decisions: ["Launch remains on track"],
          participants: ["Alex"],
        },
        intakeForm: null,
        costBreakdown: null,
        error: null,
        createdAt: "2026-04-24T00:00:00.000Z",
        updatedAt: "2026-04-24T00:00:00.000Z",
      }),
    });

    const res = await notesPackageRoute.POST(
      jsonRequest("/api/meetings/meeting_1/notes-package", "POST", {
        destination: "agent_clipboard",
        trigger: "manual_push",
        include_transcript: false,
      }),
      {
        requestId: "req_test",
        startedAt: Date.now(),
        params: { id: "meeting_1" },
      },
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ready: true,
      meetingId: "meeting_1",
      destination: "agent_clipboard",
      actionItemCount: 1,
      decisionCount: 1,
    });
    expect(body.markdown).toContain("## Action Items");
    expect(body.markdown).not.toContain("## Transcript");
  });

  it("GET /api/webhooks requires an authenticated user", async () => {
    mocks.getCurrentUserId.mockResolvedValue(null);

    const res = await webhooksRoute.GET(jsonRequest("/api/webhooks", "GET"));

    expect(res.status).toBe(401);
    expect(mocks.getSupabaseServer).not.toHaveBeenCalled();
  });

  it("POST /api/webhooks validates URL before writing", async () => {
    mocks.getCurrentUserId.mockResolvedValue("user_a");
    const supabase = { from: vi.fn() };
    mocks.getSupabaseServer.mockReturnValue(supabase);

    const res = await webhooksRoute.POST(
      jsonRequest("/api/webhooks", "POST", {
        url: "not-a-url",
        events: ["meeting.completed"],
      }),
    );

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("POST /api/webhooks creates a user-scoped webhook", async () => {
    mocks.getCurrentUserId.mockResolvedValue("user_a");
    const query = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "hook_1",
          url: "https://example.com/layer-one-webhook",
          events: ["meeting.completed"],
          active: true,
          created_at: "2026-04-27T00:00:00.000Z",
        },
        error: null,
      }),
    };
    query.insert.mockReturnValue(query);
    query.select.mockReturnValue(query);
    mocks.getSupabaseServer.mockReturnValue({ from: vi.fn(() => query) });

    const res = await webhooksRoute.POST(
      jsonRequest("/api/webhooks", "POST", {
        url: "https://example.com/layer-one-webhook",
        events: ["meeting.completed"],
        secret: "secret_123",
      }),
    );

    expect(res.status).toBe(201);
    expect(query.insert).toHaveBeenCalledWith({
      user_id: "user_a",
      url: "https://example.com/layer-one-webhook",
      events: ["meeting.completed"],
      secret: "secret_123",
      active: true,
    });
    await expect(res.json()).resolves.toMatchObject({
      webhook: { id: "hook_1", active: true },
    });
  });

  it("GET /api/webhooks/deliveries requires an authenticated user", async () => {
    mocks.getCurrentUserId.mockResolvedValue(null);

    const res = await webhookDeliveriesRoute.GET(
      jsonRequest("/api/webhooks/deliveries", "GET"),
    );

    expect(res.status).toBe(401);
    expect(mocks.getSupabaseServer).not.toHaveBeenCalled();
  });

  it("GET /api/webhooks/deliveries returns recent user-owned deliveries", async () => {
    mocks.getCurrentUserId.mockResolvedValue("user_a");
    const hooksQuery = {
      select: vi.fn(),
      eq: vi.fn().mockResolvedValue({
        data: [{ id: "hook_1", url: "https://example.com/hook" }],
        error: null,
      }),
    };
    hooksQuery.select.mockReturnValue(hooksQuery);
    const deliveriesQuery = {
      select: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: "delivery_1",
            webhook_id: "hook_1",
            event: "meeting.completed",
            meeting_id: "meeting_1",
            status_code: 200,
            success: true,
            created_at: "2026-04-27T00:00:00.000Z",
          },
        ],
        error: null,
      }),
    };
    deliveriesQuery.select.mockReturnValue(deliveriesQuery);
    deliveriesQuery.in.mockReturnValue(deliveriesQuery);
    deliveriesQuery.order.mockReturnValue(deliveriesQuery);
    const from = vi.fn((table: string) =>
      table === "webhooks" ? hooksQuery : deliveriesQuery,
    );
    mocks.getSupabaseServer.mockReturnValue({ from });

    const res = await webhookDeliveriesRoute.GET(
      jsonRequest("/api/webhooks/deliveries?limit=5", "GET"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(hooksQuery.eq).toHaveBeenCalledWith("user_id", "user_a");
    expect(deliveriesQuery.in).toHaveBeenCalledWith("webhook_id", ["hook_1"]);
    expect(deliveriesQuery.limit).toHaveBeenCalledWith(5);
    expect(body.deliveries).toEqual([
      {
        id: "delivery_1",
        webhookId: "hook_1",
        webhookUrl: "https://example.com/hook",
        event: "meeting.completed",
        meetingId: "meeting_1",
        statusCode: 200,
        success: true,
        createdAt: "2026-04-27T00:00:00.000Z",
      },
    ]);
  });

  it("DELETE /api/webhooks validates a webhook id before deleting", async () => {
    mocks.getCurrentUserId.mockResolvedValue("user_a");
    const supabase = { from: vi.fn() };
    mocks.getSupabaseServer.mockReturnValue(supabase);

    const res = await webhooksRoute.DELETE(
      jsonRequest("/api/webhooks", "DELETE", {}),
    );

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
