import { describe, expect, it } from "vitest";
import { DEFAULT_AGENT_BUILD, summarizeAgentBuild } from "@/lib/agent-builder";

describe("summarizeAgentBuild", () => {
  it("creates a launch summary from the selected build", () => {
    const summary = summarizeAgentBuild({
      ...DEFAULT_AGENT_BUILD,
      name: "Atlas",
      archetype: "researcher",
      room: "war-room",
      style: "technical",
      tools: ["search", "calendar", "voice"],
      autonomy: 90,
      empathy: 60,
      speed: 80,
    });

    expect(summary.headline).toContain("Atlas");
    expect(summary.headline).toContain("technical");
    expect(summary.role).toContain("decision room");
    expect(summary.strengths.join(" ")).toContain("Meeting search");
    expect(summary.readinessScore).toBe(77);
  });

  it("clamps readiness score to 100", () => {
    const summary = summarizeAgentBuild({
      ...DEFAULT_AGENT_BUILD,
      tools: ["calendar", "search", "voice", "crm"],
      autonomy: 100,
      empathy: 100,
      speed: 100,
    });

    expect(summary.readinessScore).toBe(100);
  });
});
