import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseServer: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: mocks.getSupabaseServer,
}));

const { fireWebhooks } = await import("@/lib/webhooks/fire");

function supabaseMock(hooks: unknown[]) {
  const deliveryInsert = vi.fn().mockResolvedValue({ error: null });
  const webhookQuery = {
    select: vi.fn(),
    eq: vi.fn(),
  };
  webhookQuery.select.mockReturnValue(webhookQuery);
  webhookQuery.eq.mockImplementation((column: string) => {
    if (column === "active") {
      return Promise.resolve({ data: hooks, error: null });
    }
    return webhookQuery;
  });

  const from = vi.fn((table: string) => {
    if (table === "webhooks") return webhookQuery;
    return { insert: deliveryInsert };
  });

  return { client: { from }, deliveryInsert, webhookQuery };
}

describe("fireWebhooks", () => {
  beforeEach(() => {
    mocks.getSupabaseServer.mockReset();
    vi.unstubAllGlobals();
  });

  it("delivers only hooks subscribed to the exact event", async () => {
    const { client, deliveryInsert } = supabaseMock([
      {
        id: "hook_completed",
        user_id: "user_a",
        url: "https://example.com/completed",
        events: ["meeting.completed"],
        secret: null,
        active: true,
      },
      {
        id: "hook_error",
        user_id: "user_a",
        url: "https://example.com/error",
        events: ["meeting.error"],
        secret: null,
        active: true,
      },
    ]);
    mocks.getSupabaseServer.mockReturnValue(client);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal("fetch", fetchMock);

    await fireWebhooks("user_a", "meeting.error", "meeting_1", {
      reason: "provider_error",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/error",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Webhook-Event": "meeting.error",
        }),
      }),
    );
    expect(deliveryInsert).toHaveBeenCalledWith({
      webhook_id: "hook_error",
      event: "meeting.error",
      meeting_id: "meeting_1",
      status_code: 202,
      success: true,
    });
  });

  it("signs webhook payloads and logs failed deliveries", async () => {
    const { client, deliveryInsert } = supabaseMock([
      {
        id: "hook_signed",
        user_id: "user_a",
        url: "https://example.com/signed",
        events: ["meeting.completed"],
        secret: "secret_123",
        active: true,
      },
    ]);
    mocks.getSupabaseServer.mockReturnValue(client);
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    await fireWebhooks("user_a", "meeting.completed", "meeting_1", {
      notesPackage: { ready: true },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/signed",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Webhook-Signature": expect.stringMatching(/^sha256=[a-f0-9]{64}$/),
        }),
      }),
    );
    expect(deliveryInsert).toHaveBeenCalledWith({
      webhook_id: "hook_signed",
      event: "meeting.completed",
      meeting_id: "meeting_1",
      status_code: null,
      success: false,
    });
  });
});
