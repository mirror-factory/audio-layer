import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect } from "react";

import { AIDebugPanel, pushAIDebugEvent } from "./ai-debug-panel";

function SeededPanel() {
  useEffect(() => {
    pushAIDebugEvent({
      label: "chat",
      provider: "vercel-ai-gateway",
      modelId: "anthropic/claude-haiku-4-5",
      duration: 940,
      steps: 2,
      inputTokens: 1840,
      outputTokens: 420,
      cost: 0.0031,
      toolCalls: ["searchDocuments", "updateSettings"],
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
  }, []);

  return (
    <div className="min-h-96 bg-neutral-950 p-8 text-neutral-100">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">
        AI debug panel story surface
      </p>
      <AIDebugPanel />
    </div>
  );
}

const meta = {
  title: "Starter/AI Debug Panel",
  component: AIDebugPanel,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AIDebugPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithUsage: Story = {
  render: () => <SeededPanel />,
};
