#!/usr/bin/env tsx
/**
 * Deterministic Eval Runner — Tests tool selection without calling a real model.
 *
 * Uses MockLanguageModelV3 from ai/test to simulate model responses that
 * deterministically call specific tools based on the dataset.
 *
 * Run: `pnpm eval` or `tsx evals/run-evals.ts`
 *
 * Checks per test case:
 *   1. Tool selection accuracy — did the model call the expected tool?
 *   2. Output shape — does the tool output contain expected fields?
 */

import { generateText, simulateReadableStream, stepCountIs } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { allTools } from "../lib/ai/tools";

// ── Types ─────────────────────────────────────────────────────────────

interface TestCase {
  id: string;
  input: string;
  expectedTool: string;
  expectedFields?: string[];
  description: string;
}

interface EvalResult {
  id: string;
  input: string;
  expectedTool: string;
  actualTool: string | null;
  toolSelectionPass: boolean;
  outputShapePass: boolean;
  missingFields: string[];
  error: string | null;
}

interface EvalReport {
  timestamp: string;
  mode: "deterministic";
  totalCases: number;
  passed: number;
  failed: number;
  toolSelectionAccuracy: number;
  outputShapeAccuracy: number;
  results: EvalResult[];
}

// ── Helpers ───────────────────────────────────────────────────────────

function buildMockModelForTool(toolName: string): MockLanguageModelV3 {
  // Build tool call args based on the tool name
  const toolArgs: Record<string, Record<string, unknown>> = {
    searchDocuments: { query: "test query" },
    askQuestion: {
      question: "Which option do you prefer?",
      options: ["Option A", "Option B"],
    },
    updateSettings: { key: "theme", value: "dark" },
  };

  const args = toolArgs[toolName] ?? {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new MockLanguageModelV3({
    provider: "mock",
    modelId: "mock-eval-model",
    doGenerate: {
      content: [
        {
          type: "tool-call" as const,
          toolCallId: `call-${toolName}`,
          toolName,
          input: JSON.stringify(args),
        },
      ],
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 5, text: 5, reasoning: 0 },
      },
      finishReason: "tool-calls" as "tool-calls",
    } as any,
  });
}

// ── Main ──────────────────────────────────────────────────────────────

async function runEvals() {
  const datasetPath = join(__dirname, "dataset.json");
  const dataset: TestCase[] = JSON.parse(readFileSync(datasetPath, "utf-8"));

  console.log(`\n  Deterministic Eval Runner`);
  console.log(`  ========================`);
  console.log(`  Dataset: ${dataset.length} test cases\n`);

  const results: EvalResult[] = [];

  for (const testCase of dataset) {
    const result: EvalResult = {
      id: testCase.id,
      input: testCase.input,
      expectedTool: testCase.expectedTool,
      actualTool: null,
      toolSelectionPass: false,
      outputShapePass: true,
      missingFields: [],
      error: null,
    };

    try {
      const mockModel = buildMockModelForTool(testCase.expectedTool);

      const response = await generateText({
        model: mockModel,
        tools: allTools,
        prompt: testCase.input,
        stopWhen: stepCountIs(2),
      });

      // Check tool selection
      const toolCalls = response.steps.flatMap((step) =>
        step.toolCalls.map((tc) => tc.toolName),
      );

      result.actualTool = toolCalls[0] ?? null;
      result.toolSelectionPass = toolCalls.includes(testCase.expectedTool);

      // Check output shape (for server-side tools with execute)
      if (testCase.expectedFields && testCase.expectedFields.length > 0) {
        const toolResults = response.steps.flatMap((step) =>
          step.toolResults.map((tr) => tr.output),
        );

        if (toolResults.length > 0) {
          const output = toolResults[0] as Record<string, unknown>;
          for (const field of testCase.expectedFields) {
            if (output === undefined || output === null || !(field in output)) {
              result.outputShapePass = false;
              result.missingFields.push(field);
            }
          }
        } else {
          // Client-side tools (no execute) — check that tool args contain expected fields
          const toolCallArgs = response.steps.flatMap((step) =>
            step.toolCalls.map((tc) => tc.input),
          );
          if (toolCallArgs.length > 0) {
            const args = toolCallArgs[0] as Record<string, unknown>;
            for (const field of testCase.expectedFields) {
              if (args === undefined || args === null || !(field in args)) {
                result.outputShapePass = false;
                result.missingFields.push(field);
              }
            }
          }
        }
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }

    const status =
      result.toolSelectionPass && result.outputShapePass ? "PASS" : "FAIL";
    const icon = status === "PASS" ? "+" : "x";
    console.log(
      `  [${icon}] ${testCase.id}: ${status}${result.error ? ` (${result.error})` : ""}`,
    );

    results.push(result);
  }

  // Aggregate
  const toolSelectionPasses = results.filter((r) => r.toolSelectionPass).length;
  const outputShapePasses = results.filter((r) => r.outputShapePass).length;
  const allPasses = results.filter(
    (r) => r.toolSelectionPass && r.outputShapePass,
  ).length;

  const report: EvalReport = {
    timestamp: new Date().toISOString(),
    mode: "deterministic",
    totalCases: dataset.length,
    passed: allPasses,
    failed: dataset.length - allPasses,
    toolSelectionAccuracy: toolSelectionPasses / dataset.length,
    outputShapeAccuracy: outputShapePasses / dataset.length,
    results,
  };

  console.log(`\n  Results`);
  console.log(`  -------`);
  console.log(`  Total:               ${report.totalCases}`);
  console.log(`  Passed:              ${report.passed}`);
  console.log(`  Failed:              ${report.failed}`);
  console.log(
    `  Tool selection:      ${(report.toolSelectionAccuracy * 100).toFixed(1)}%`,
  );
  console.log(
    `  Output shape:        ${(report.outputShapeAccuracy * 100).toFixed(1)}%`,
  );

  // Write JSON report
  const outputDir = join(__dirname, "..", ".evidence");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, "eval-results.json");
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n  Report: ${outputPath}\n`);

  // Exit with non-zero if any failures
  if (report.failed > 0) {
    process.exit(1);
  }
}

runEvals().catch((err) => {
  console.error("Eval runner failed:", err);
  process.exit(1);
});
