import { describe, expect, it } from "vitest";
import {
  countWorkspaceWords,
  formatWorkspaceTimestamp,
} from "./session-workspace";

describe("session-workspace utilities", () => {
  it("formats transcript timestamps from milliseconds", () => {
    expect(formatWorkspaceTimestamp(0)).toBe("0:00");
    expect(formatWorkspaceTimestamp(13_000)).toBe("0:13");
    expect(formatWorkspaceTimestamp(71_000)).toBe("1:11");
  });

  it("counts words for session metrics", () => {
    expect(countWorkspaceWords("Audio notes are working well.")).toBe(5);
    expect(countWorkspaceWords("  decisions   owners\n due dates ")).toBe(4);
  });
});
