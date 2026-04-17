/**
 * InMemoryMeetingsStore tests.
 *
 * Covers insert/update/get/list round-trips, partial updates preserving
 * existing fields, list ordering by createdAt desc, and FIFO eviction
 * at the cap. The Supabase implementation is integration-tested
 * separately (needs a live DB) — not in this suite.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryMeetingsStore } from "@/lib/meetings/store-in-memory";
import type { MeetingSummary } from "@/lib/assemblyai/schema";

const summaryFixture: MeetingSummary = {
  title: "Kickoff sync",
  summary: "Team aligned on scope.",
  keyPoints: ["Pick engine", "Lock price"],
  actionItems: [],
  decisions: [],
  participants: ["Speaker A"],
};

describe("InMemoryMeetingsStore", () => {
  let store: InMemoryMeetingsStore;

  beforeEach(() => {
    store = new InMemoryMeetingsStore();
  });

  it("inserts a row with defaults and returns it", async () => {
    const m = await store.insert({ id: "tr-1" });
    expect(m.id).toBe("tr-1");
    expect(m.status).toBe("processing");
    expect(m.utterances).toEqual([]);
    expect(m.summary).toBeNull();
    expect(m.createdAt).toBeTruthy();
  });

  it("get returns null for unknown ids", async () => {
    expect(await store.get("missing")).toBeNull();
  });

  it("update merges fields and bumps updatedAt", async () => {
    const inserted = await store.insert({ id: "tr-1" });
    const before = inserted.updatedAt;
    // Force a clock tick so updatedAt is strictly greater.
    await new Promise((r) => setTimeout(r, 2));
    const updated = await store.update("tr-1", {
      status: "completed",
      summary: summaryFixture,
      title: summaryFixture.title,
      text: "hello",
    });
    expect(updated).not.toBeNull();
    expect(updated?.status).toBe("completed");
    expect(updated?.summary?.title).toBe("Kickoff sync");
    expect(updated?.text).toBe("hello");
    expect(updated?.updatedAt ?? "").not.toBe("");
    expect((updated?.updatedAt ?? "") >= before).toBe(true);
  });

  it("update returns null when the id is missing", async () => {
    expect(await store.update("none", { status: "completed" })).toBeNull();
  });

  it("update preserves fields not in the patch", async () => {
    await store.insert({ id: "tr-1", title: "Original" });
    await store.update("tr-1", { text: "t" });
    const after = await store.get("tr-1");
    expect(after?.title).toBe("Original");
    expect(after?.text).toBe("t");
  });

  it("list orders by createdAt descending", async () => {
    await store.insert({ id: "a" });
    await new Promise((r) => setTimeout(r, 2));
    await store.insert({ id: "b" });
    await new Promise((r) => setTimeout(r, 2));
    await store.insert({ id: "c" });
    const list = await store.list(10);
    expect(list.map((m) => m.id)).toEqual(["c", "b", "a"]);
  });

  it("list respects the limit", async () => {
    for (let i = 0; i < 5; i++) await store.insert({ id: `id-${i}` });
    const list = await store.list(2);
    expect(list).toHaveLength(2);
  });

  it("evicts the oldest entry past 500 records (FIFO)", async () => {
    for (let i = 0; i < 500; i++) {
      await store.insert({ id: `id-${i}` });
    }
    expect(store.size()).toBe(500);
    await store.insert({ id: "id-500" });
    expect(store.size()).toBe(500);
    expect(await store.get("id-0")).toBeNull();
    expect(await store.get("id-500")).not.toBeNull();
  });

  it("list projects MeetingListItem shape only", async () => {
    await store.insert({ id: "tr-1", title: "Hi" });
    await store.update("tr-1", { durationSeconds: 120 });
    const [item] = await store.list(10);
    expect(item).toMatchObject({
      id: "tr-1",
      title: "Hi",
      durationSeconds: 120,
    });
    expect("utterances" in item).toBe(false);
    expect("summary" in item).toBe(false);
  });
});
