import { AgentBuilder } from "./agent-builder";

const meta = {
  title: "Components/agent-builder",
};

export default meta;

export const Default = {
  render: () => (
    <div className="paper-calm-page min-h-screen-safe bg-[var(--bg-primary)]">
      <AgentBuilder />
    </div>
  ),
};
