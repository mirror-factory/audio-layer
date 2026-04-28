// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AIDebugPanel,
  pushAIDebugEvent,
} from "../../../components/ai-debug-panel";

const SAMPLE_EVENT = {
  id: "debug-1",
  label: "chat",
  provider: "vercel-ai-gateway",
  modelId: "anthropic/claude-haiku-4-5",
  duration: 1230,
  steps: 2,
  inputTokens: 1200,
  outputTokens: 300,
  cost: 0.0022,
  toolCalls: ["searchDocuments"],
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  timestamp: Date.now(),
};

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
});

describe("ai-debug-panel component", () => {
  it("renders an empty local-first state before AI calls arrive", () => {
    render(<AIDebugPanel />);

    expect(screen.getByText("AI Debug")).toBeInTheDocument();
    expect(screen.getByText(/No AI calls yet/i)).toBeInTheDocument();
    expect(screen.getByText("0 calls this session")).toBeInTheDocument();
  });

  it("records browser debug events with token and cost summaries", () => {
    render(<AIDebugPanel />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent("ai-debug", {
          detail: SAMPLE_EVENT,
        }),
      );
    });

    expect(screen.getByText("chat")).toBeInTheDocument();
    expect(screen.getAllByText("1.5K").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$0.0022").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("chat"));
    expect(screen.getByText("vercel-ai-gateway")).toBeInTheDocument();
    expect(screen.getByText("anthropic/claude-haiku-4-5")).toBeInTheDocument();
    expect(screen.getByText("searchDocuments")).toBeInTheDocument();
  });

  it("emits the public push event helper for client chat integrations", () => {
    const listener = vi.fn();
    window.addEventListener("ai-debug", listener);

    pushAIDebugEvent({
      label: "tool-run",
      provider: "vercel-ai-gateway",
      modelId: "openai/gpt-4.1-mini",
      duration: 400,
      steps: 1,
      inputTokens: 50,
      outputTokens: 25,
      cost: 0.0001,
      toolCalls: [],
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toMatchObject({
      label: "tool-run",
      modelId: "openai/gpt-4.1-mini",
    });

    window.removeEventListener("ai-debug", listener);
  });
});
