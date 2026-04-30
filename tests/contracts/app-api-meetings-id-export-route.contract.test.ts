import { GET } from "@/app/api/meetings/[id]/export/route";
import { getMeetingsStore, type MeetingsStore } from "@/lib/meetings/store";
import type { Meeting } from "@/lib/meetings/types";
import { apiRouteContracts } from "@/tests/api/route-contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/meetings/store", () => ({
  getMeetingsStore: vi.fn(),
}));

const meeting: Meeting = {
  id: "contract_meeting_1",
  status: "completed",
  title: "Export Contract Review",
  text: "The export contract should stay stable.",
  utterances: [],
  durationSeconds: 60,
  summary: null,
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

function request(url: string) {
  return new Request(url, {
    headers: { "x-request-id": "req_export_contract" },
  }) as Parameters<typeof GET>[0];
}

describe("app/api/meetings/[id]/export/route.ts request and response contract", () => {
  beforeEach(() => {
    vi.mocked(getMeetingsStore).mockReset();
  });

  it("is registered as a GET user route with file export response semantics", () => {
    const contract = apiRouteContracts.find(
      (candidate) => candidate.file === "app/api/meetings/[id]/export/route.ts",
    );

    expect(contract).toMatchObject({
      route: "/api/meetings/[id]/export",
      smokePath: "/api/meetings/sample/export",
      methods: ["GET"],
      auth: "user",
      assertJson: false,
      requiresRequestId: true,
    });
  });

  it("defaults to markdown and sets attachment headers", async () => {
    vi.mocked(getMeetingsStore).mockResolvedValue(storeReturning(meeting));

    const response = await GET(
      request("http://localhost/api/meetings/contract_meeting_1/export"),
      { params: { id: meeting.id } },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="2026-04-28-export-contract-review.md"',
    );
    expect(response.headers.get("x-request-id")).toBe("req_export_contract");
  });

  it("uses JSON error bodies for client errors", async () => {
    vi.mocked(getMeetingsStore).mockResolvedValue(storeReturning(meeting));

    const response = await GET(
      request("http://localhost/api/meetings/contract_meeting_1/export?format=zip"),
      { params: { id: meeting.id } },
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({
      error: "Unsupported format: zip. Use 'md' or 'pdf'.",
    });
  });
});
