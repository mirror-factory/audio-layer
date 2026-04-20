import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryMeetingsStore } from "@/lib/meetings/store-in-memory";

describe("InMemoryMeetingsStore", () => {
  let storeInstance: InMemoryMeetingsStore;

  beforeEach(() => {
    storeInstance = new InMemoryMeetingsStore();
  });

  it("insert returns the created meeting", async () => {
    const meeting = await storeInstance.insert({
      id: "test-1",
      title: "My Meeting",
    });

    expect(meeting.id).toBe("test-1");
    expect(meeting.title).toBe("My Meeting");
    expect(meeting.status).toBe("processing");
    expect(meeting.text).toBeNull();
    expect(meeting.utterances).toEqual([]);
    expect(meeting.summary).toBeNull();
    expect(meeting.error).toBeNull();
    expect(meeting.createdAt).toBeTruthy();
    expect(meeting.updatedAt).toBeTruthy();
  });

  it("insert uses default status when not provided", async () => {
    const meeting = await storeInstance.insert({ id: "test-2" });
    expect(meeting.status).toBe("processing");
    expect(meeting.title).toBeNull();
  });

  it("get retrieves an inserted meeting", async () => {
    await storeInstance.insert({ id: "test-3", title: "Findable" });

    const found = await storeInstance.get("test-3");
    expect(found).not.toBeNull();
    expect(found!.id).toBe("test-3");
    expect(found!.title).toBe("Findable");
  });

  it("get returns null for non-existent id", async () => {
    const found = await storeInstance.get("does-not-exist");
    expect(found).toBeNull();
  });

  it("update modifies an existing meeting", async () => {
    await storeInstance.insert({ id: "test-4" });

    const updated = await storeInstance.update("test-4", {
      title: "Updated Title",
      status: "completed",
    });

    expect(updated).not.toBeNull();
    expect(updated!.title).toBe("Updated Title");
    expect(updated!.status).toBe("completed");
  });

  it("update returns null for non-existent id", async () => {
    const result = await storeInstance.update("no-such-id", {
      title: "Nope",
    });
    expect(result).toBeNull();
  });

  it("update sets updatedAt to a new value", async () => {
    const meeting = await storeInstance.insert({ id: "test-5" });
    const originalUpdatedAt = meeting.updatedAt;

    // Small delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 5));

    const updated = await storeInstance.update("test-5", { title: "New" });
    expect(updated!.updatedAt).not.toBe(originalUpdatedAt);
  });

  it("list returns items sorted by createdAt desc", async () => {
    // Insert with small delays to get different timestamps
    await storeInstance.insert({ id: "sort-a", title: "First" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await storeInstance.insert({ id: "sort-b", title: "Second" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await storeInstance.insert({ id: "sort-c", title: "Third" });

    const items = await storeInstance.list(100);

    // Filter to only our test items (shared singleton may have others)
    const ours = items.filter((i) => i.id.startsWith("sort-"));
    expect(ours).toHaveLength(3);
    // Most recent first
    expect(ours[0].id).toBe("sort-c");
    expect(ours[1].id).toBe("sort-b");
    expect(ours[2].id).toBe("sort-a");
  });

  it("list respects limit", async () => {
    await storeInstance.insert({ id: "lim-1" });
    await storeInstance.insert({ id: "lim-2" });
    await storeInstance.insert({ id: "lim-3" });

    const items = await storeInstance.list(2);
    // Limit works: returns at most 2 items
    expect(items.length).toBeLessThanOrEqual(2);
  });

  it("list returns MeetingListItem shape (no full fields)", async () => {
    await storeInstance.insert({ id: "shape-test", title: "Shape" });

    const items = await storeInstance.list(10);
    expect(items[0]).toHaveProperty("id");
    expect(items[0]).toHaveProperty("status");
    expect(items[0]).toHaveProperty("title");
    expect(items[0]).toHaveProperty("durationSeconds");
    expect(items[0]).toHaveProperty("createdAt");
    // Should NOT have full meeting fields
    expect(items[0]).not.toHaveProperty("text");
    expect(items[0]).not.toHaveProperty("summary");
    expect(items[0]).not.toHaveProperty("utterances");
  });
});
