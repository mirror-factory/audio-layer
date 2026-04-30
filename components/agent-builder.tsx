"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  Brain,
  CalendarDays,
  Check,
  Gauge,
  Handshake,
  Mic2,
  Search,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import {
  DEFAULT_AGENT_BUILD,
  summarizeAgentBuild,
  type AgentArchetype,
  type AgentBuilderState,
  type AgentRoom,
  type AgentStyle,
  type AgentTool,
} from "@/lib/agent-builder";

const archetypes: Array<{
  id: AgentArchetype;
  label: string;
  icon: typeof Bot;
  color: string;
}> = [
  { id: "concierge", label: "Concierge", icon: Handshake, color: "#14b8a6" },
  { id: "researcher", label: "Researcher", icon: Brain, color: "#6366f1" },
  { id: "operator", label: "Operator", icon: Workflow, color: "#f59e0b" },
];

const rooms: Array<{ id: AgentRoom; label: string; accent: string }> = [
  { id: "studio", label: "Studio", accent: "#14b8a6" },
  { id: "war-room", label: "Decision", accent: "#ef4444" },
  { id: "workshop", label: "Workshop", accent: "#f59e0b" },
];

const styles: Array<{ id: AgentStyle; label: string }> = [
  { id: "calm", label: "Calm" },
  { id: "bold", label: "Bold" },
  { id: "technical", label: "Technical" },
];

const tools: Array<{ id: AgentTool; label: string; icon: typeof Bot }> = [
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "search", label: "Search", icon: Search },
  { id: "voice", label: "Voice", icon: Mic2 },
  { id: "crm", label: "CRM", icon: Workflow },
];

const roomFurniture: Record<AgentRoom, string[]> = {
  studio: ["Briefing desk", "Focus lamp", "Memory shelf"],
  "war-room": ["Decision wall", "Risk board", "Action table"],
  workshop: ["Tool rack", "Automation bench", "Queue monitor"],
};

export function AgentBuilder({ initialState = DEFAULT_AGENT_BUILD }: { initialState?: AgentBuilderState }) {
  const [build, setBuild] = useState<AgentBuilderState>(initialState);
  const summary = useMemo(() => summarizeAgentBuild(build), [build]);
  const selectedArchetype = archetypes.find((item) => item.id === build.archetype) ?? archetypes[0];
  const selectedRoom = rooms.find((item) => item.id === build.room) ?? rooms[0];

  const updateBuild = <Key extends keyof AgentBuilderState>(
    key: Key,
    value: AgentBuilderState[Key],
  ) => {
    setBuild((current) => ({ ...current, [key]: value }));
  };

  const toggleTool = (tool: AgentTool) => {
    setBuild((current) => ({
      ...current,
      tools: current.tools.includes(tool)
        ? current.tools.filter((item) => item !== tool)
        : [...current.tools, tool],
    }));
  };

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 pb-[calc(5rem+var(--safe-bottom))] py-4 lg:grid-cols-[300px_minmax(0,1fr)_330px] lg:pb-8">
      <aside className="signal-panel rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] text-[var(--accent-mint)]">
            <Sparkles size={17} />
          </span>
          <div>
            <p className="signal-eyebrow">Create mode</p>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Agent blueprint</h2>
          </div>
        </div>

        <label className="mt-5 block text-xs font-semibold text-[var(--text-secondary)]" htmlFor="agent-name">
          Name
        </label>
        <input
          id="agent-name"
          value={build.name}
          onChange={(event) => updateBuild("name", event.target.value)}
          className="signal-input mt-2 h-10 w-full rounded-lg px-3 text-sm text-[var(--text-primary)] outline-none"
          maxLength={24}
        />

        <BuilderSection title="Type">
          <div className="grid gap-2">
            {archetypes.map((item) => {
              const Icon = item.icon;
              const selected = build.archetype === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => updateBuild("archetype", item.id)}
                  className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 text-left text-sm transition-colors ${
                    selected
                      ? "border-[var(--accent-mint)] bg-[var(--surface-control-hover)] text-[var(--text-primary)]"
                      : "border-[var(--border-card)] bg-[var(--surface-control)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  aria-pressed={selected}
                >
                  <Icon size={16} style={{ color: item.color }} />
                  <span className="font-medium">{item.label}</span>
                  {selected ? <Check className="ml-auto text-[var(--accent-mint)]" size={15} /> : null}
                </button>
              );
            })}
          </div>
        </BuilderSection>

        <BuilderSection title="Trait tuning">
          <TraitSlider icon={Gauge} label="Autonomy" value={build.autonomy} onChange={(value) => updateBuild("autonomy", value)} />
          <TraitSlider icon={Handshake} label="Empathy" value={build.empathy} onChange={(value) => updateBuild("empathy", value)} />
          <TraitSlider icon={Zap} label="Speed" value={build.speed} onChange={(value) => updateBuild("speed", value)} />
        </BuilderSection>
      </aside>

      <main className="signal-panel min-h-[620px] overflow-hidden rounded-lg">
        <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="signal-eyebrow">Build view</p>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Design the agent and its workspace.</h1>
          </div>
          <div className="grid grid-cols-3 rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] p-1">
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => updateBuild("room", room.id)}
                className={`min-h-8 rounded-md px-3 text-xs font-semibold transition-colors ${
                  build.room === room.id
                    ? "bg-[var(--surface-panel)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                aria-pressed={build.room === room.id}
              >
                {room.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-h-[540px] overflow-hidden bg-[color-mix(in_oklch,var(--surface-control)_62%,transparent)] p-4">
          <div className="absolute inset-0 signal-divider-grid opacity-70" aria-hidden="true" />
          <div
            className="relative mx-auto grid min-h-[500px] max-w-4xl grid-cols-[0.7fr_1fr_0.7fr] grid-rows-[1fr_0.7fr] gap-3 rounded-lg border border-[var(--border-card)] bg-[color-mix(in_oklch,white_64%,var(--surface-control)_36%)] p-4 shadow-[0_28px_90px_rgba(15,23,42,0.12)] dark:bg-[rgba(255,255,255,0.045)]"
            style={{ borderColor: `${selectedRoom.accent}55` }}
          >
            {roomFurniture[build.room].map((item, index) => (
              <FurnitureBlock key={item} label={item} index={index} accent={selectedRoom.accent} />
            ))}

            <div className="col-start-2 row-span-2 flex items-center justify-center">
              <AgentAvatar
                name={build.name}
                accent={selectedArchetype.color}
                styleName={build.style}
                score={summary.readinessScore}
              />
            </div>

            <div className="col-start-3 row-start-2 flex flex-col justify-end gap-2">
              {build.tools.map((tool) => {
                const item = tools.find((option) => option.id === tool);
                if (!item) return null;
                const Icon = item.icon;
                return (
                  <div
                    key={tool}
                    className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border-card)] bg-[var(--surface-panel)] px-3 text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    <Icon size={15} className="text-[var(--accent-mint)]" />
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <aside className="grid gap-4">
        <section className="signal-panel rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="signal-eyebrow">Launch score</p>
              <p className="text-3xl font-semibold tabular-nums text-[var(--text-primary)]">{summary.readinessScore}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] text-[var(--accent-mint)]">
              <Bot size={24} />
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold leading-5 text-[var(--text-primary)]">{summary.headline}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{summary.role}</p>
        </section>

        <section className="signal-panel rounded-lg p-4">
          <p className="signal-eyebrow">Style</p>
          <div className="mt-3 grid grid-cols-3 rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] p-1">
            {styles.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => updateBuild("style", style.id)}
                className={`min-h-8 rounded-md px-2 text-xs font-semibold transition-colors ${
                  build.style === style.id
                    ? "bg-[var(--surface-panel)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                aria-pressed={build.style === style.id}
              >
                {style.label}
              </button>
            ))}
          </div>
        </section>

        <section className="signal-panel rounded-lg p-4">
          <p className="signal-eyebrow">Install tools</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const selected = build.tools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => toggleTool(tool.id)}
                  className={`flex min-h-20 flex-col items-start justify-between rounded-lg border p-3 text-left transition-colors ${
                    selected
                      ? "border-[var(--accent-mint)] bg-[var(--surface-control-hover)] text-[var(--text-primary)]"
                      : "border-[var(--border-card)] bg-[var(--surface-control)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  aria-pressed={selected}
                >
                  <Icon size={17} className={selected ? "text-[var(--accent-mint)]" : "text-[var(--text-muted)]"} />
                  <span className="text-xs font-semibold">{tool.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="signal-panel rounded-lg p-4">
          <p className="signal-eyebrow">Launch brief</p>
          <div className="mt-3 space-y-3">
            {summary.strengths.map((strength) => (
              <p key={strength} className="rounded-lg border border-[var(--border-card)] bg-[var(--surface-control)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
                {strength}
              </p>
            ))}
          </div>
          <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
            {summary.launchChecklist.map((item) => (
              <div key={item} className="flex items-center gap-2 py-1.5 text-xs text-[var(--text-muted)]">
                <Check size={13} className="text-[var(--accent-mint)]" />
                {item}
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function BuilderSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 border-t border-[var(--border-subtle)] pt-5">
      <p className="mb-3 text-xs font-semibold text-[var(--text-secondary)]">{title}</p>
      {children}
    </section>
  );
}

function TraitSlider({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: typeof Bot;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-2">
          <Icon size={14} className="text-[var(--accent-mint)]" />
          {label}
        </span>
        <span className="font-mono tabular-nums">{value}</span>
      </span>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full accent-[var(--accent-mint)]"
      />
    </label>
  );
}

function FurnitureBlock({ label, index, accent }: { label: string; index: number; accent: string }) {
  const placement = [
    "col-start-1 row-start-1",
    "col-start-3 row-start-1",
    "col-start-1 row-start-2",
  ][index];

  return (
    <div className={`${placement} flex items-center justify-center`}>
      <div
        className="grid min-h-24 w-full max-w-44 place-items-center rounded-lg border bg-[var(--surface-panel)] px-3 text-center text-xs font-semibold text-[var(--text-secondary)] shadow-sm"
        style={{ borderColor: `${accent}44` }}
      >
        <span className="mb-2 h-8 w-14 rounded-md" style={{ background: `${accent}22`, border: `1px solid ${accent}44` }} />
        {label}
      </div>
    </div>
  );
}

function AgentAvatar({
  name,
  accent,
  styleName,
  score,
}: {
  name: string;
  accent: string;
  styleName: AgentStyle;
  score: number;
}) {
  return (
    <div className="relative flex min-h-80 w-full max-w-72 flex-col items-center justify-center">
      <div className="absolute bottom-8 h-12 w-52 rounded-[50%] bg-[rgba(15,23,42,0.12)] blur-sm" aria-hidden="true" />
      <div className="relative grid h-64 w-44 justify-items-center">
        <div className="h-20 w-20 rounded-full border-2 bg-[var(--surface-panel)] shadow-lg" style={{ borderColor: accent }}>
          <div className="mx-auto mt-6 flex w-10 justify-between">
            <span className="h-2 w-2 rounded-full bg-[var(--text-primary)]" />
            <span className="h-2 w-2 rounded-full bg-[var(--text-primary)]" />
          </div>
          <div className="mx-auto mt-4 h-1 w-7 rounded-full" style={{ background: accent }} />
        </div>
        <div className="-mt-2 h-32 w-32 rounded-t-[42px] rounded-b-lg border-2 bg-[var(--surface-control)]" style={{ borderColor: `${accent}aa` }}>
          <div className="mx-auto mt-5 h-16 w-20 rounded-lg border border-[var(--border-card)] bg-[var(--surface-panel)]">
            <div className="m-3 h-2 rounded-full" style={{ background: accent }} />
            <div className="mx-3 mt-3 h-2 rounded-full bg-[var(--border-card)]" />
            <div className="mx-3 mt-2 h-2 w-10 rounded-full bg-[var(--border-card)]" />
          </div>
        </div>
        <div className="flex w-40 justify-between">
          <span className="h-20 w-8 rounded-full" style={{ background: `${accent}99` }} />
          <span className="h-20 w-8 rounded-full" style={{ background: `${accent}99` }} />
        </div>
      </div>
      <div className="relative mt-2 rounded-lg border border-[var(--border-card)] bg-[var(--surface-panel)] px-4 py-2 text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{name || "Unnamed"}</p>
        <p className="text-xs capitalize text-[var(--text-muted)]">{styleName} mode · {score}% ready</p>
      </div>
    </div>
  );
}
