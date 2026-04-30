import { TopBar } from "@/components/top-bar";
import { AgentBuilder } from "@/components/agent-builder";

export default function AgentBuilderPage() {
  return (
    <div className="paper-calm-page min-h-screen-safe">
      <TopBar title="Agent Builder" showBack />
      <AgentBuilder />
    </div>
  );
}
