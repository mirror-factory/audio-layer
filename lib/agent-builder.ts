export type AgentArchetype = "concierge" | "researcher" | "operator";
export type AgentRoom = "studio" | "war-room" | "workshop";
export type AgentStyle = "calm" | "bold" | "technical";
export type AgentTool = "calendar" | "search" | "voice" | "crm";

export interface AgentBuilderState {
  name: string;
  archetype: AgentArchetype;
  room: AgentRoom;
  style: AgentStyle;
  tools: AgentTool[];
  autonomy: number;
  empathy: number;
  speed: number;
}

export interface AgentBuildSummary {
  headline: string;
  role: string;
  strengths: string[];
  launchChecklist: string[];
  readinessScore: number;
}

export const DEFAULT_AGENT_BUILD: AgentBuilderState = {
  name: "Nova",
  archetype: "concierge",
  room: "studio",
  style: "calm",
  tools: ["calendar", "voice"],
  autonomy: 58,
  empathy: 76,
  speed: 64,
};

const ARCHETYPE_COPY: Record<AgentArchetype, { role: string; focus: string }> = {
  concierge: {
    role: "Meeting concierge",
    focus: "greets teammates, tracks context, and turns conversations into follow-through",
  },
  researcher: {
    role: "Research analyst",
    focus: "searches memory, compares evidence, and prepares crisp briefings",
  },
  operator: {
    role: "Workflow operator",
    focus: "routes work, updates systems, and keeps tasks moving after every call",
  },
};

const ROOM_COPY: Record<AgentRoom, string> = {
  studio: "quiet studio",
  "war-room": "decision room",
  workshop: "automation workshop",
};

const STYLE_COPY: Record<AgentStyle, string> = {
  calm: "calm and precise",
  bold: "high-energy and directive",
  technical: "technical and evidence-first",
};

const TOOL_COPY: Record<AgentTool, string> = {
  calendar: "Calendar sync",
  search: "Meeting search",
  voice: "Live voice capture",
  crm: "CRM handoff",
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function summarizeAgentBuild(state: AgentBuilderState): AgentBuildSummary {
  const archetype = ARCHETYPE_COPY[state.archetype];
  const readinessScore = clampScore(
    state.autonomy * 0.32 +
      state.empathy * 0.28 +
      state.speed * 0.24 +
      state.tools.length * 4,
  );

  const sortedTraits = [
    { label: "Autonomy", value: state.autonomy },
    { label: "Empathy", value: state.empathy },
    { label: "Speed", value: state.speed },
  ].sort((a, b) => b.value - a.value);

  const enabledTools = state.tools.map((tool) => TOOL_COPY[tool]);

  return {
    headline: `${state.name || "Unnamed agent"} is a ${STYLE_COPY[state.style]} ${archetype.role.toLowerCase()}`,
    role: `Built for a ${ROOM_COPY[state.room]} where it ${archetype.focus}.`,
    strengths: [
      `${sortedTraits[0].label} leads the build at ${sortedTraits[0].value}%.`,
      enabledTools.length
        ? `Equipped with ${enabledTools.join(", ")}.`
        : "No tools are installed yet.",
      `Best first mission: ${state.archetype === "researcher" ? "prepare a meeting intelligence brief" : state.archetype === "operator" ? "turn a transcript into routed tasks" : "host a live meeting capture"}.`,
    ],
    launchChecklist: [
      "Confirm tone and escalation boundaries",
      "Connect workspace memory",
      "Run one supervised meeting",
    ],
    readinessScore,
  };
}
