#!/usr/bin/env tsx
/**
 * Live Eval Runner — Tests tool selection with a real AI model.
 *
 * Calls the actual AI Gateway model and checks:
 *   - Tool selection accuracy (did the model pick the right tool?)
 *   - Latency stats (TTFT, total duration)
 *   - Cost tracking
 *
 * Run: `pnpm eval:live` or `tsx evals/live-eval.ts`
 *
 * Requires: AI_GATEWAY_API_KEY environment variable.
 * Cost: ~$0.01-0.05 depending on model and dataset size.
 */

import { generateText, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
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

interface LiveEvalResult {
  id: string;
  input: string;
  expectedTool: string;
  actualTool: string | null;
  allToolCalls: string[];
  toolSelectionPass: boolean;
  outputShapePass: boolean;
  missingFields: string[];
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  error: string | null;
}

interface LiveEvalReport {
  timestamp: string;
  mode: "live";
  modelId: string;
  totalCases: number;
  passed: number;
  failed: number;
  toolSelectionAccuracy: number;
  outputShapeAccuracy: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgDurationMs: number;
  results: LiveEvalResult[];
}

// ── Cost calculation ─────────────────────────────────────────────────

const MODEL_COSTS: Record<string, [number, number]> = {
  "gpt-4.1-nano": [0.1, 0.4],
  "gpt-4.1-mini": [0.4, 1.6],
  "gpt-4.1": [2.0, 8.0],
  "gemini-3-flash": [0.5, 3.0],
  "gemini-2.5-flash": [0.15, 0.6],
};

function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const key = Object.keys(MODEL_COSTS).find((k) => modelId.includes(k));
  if (!key) return 0;
  const [inputCost, outputCost] = MODEL_COSTS[key];
  return (inputTokens * inputCost + outputTokens * outputCost) / 1_000_000;
}

// ── Main ──────────────────────────────────────────────────────────────

const MODEL_ID = process.env.EVAL_MODEL ?? "openai/gpt-4.1-nano";

const SYSTEM_PROMPT = `You are a helpful assistant with 3 tools available:
- searchDocuments: Search the knowledge base. Use when the user asks to find or look up information.
- askQuestion: Ask the user a multiple-choice question. Use when you need the user to pick from options.
- updateSettings: Update a configuration value. Use when the user asks to change a setting.

Always use the most appropriate tool for each request. Be decisive.`;

async function runLiveEvals() {
  // Check for API key
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error(
      "\n  ERROR: AI_GATEWAY_API_KEY is not set. Live evals require an API key.\n",
    );
    console.error(
      "  Set it in .env.local or pass it directly:\n    AI_GATEWAY_API_KEY=vck_xxx tsx evals/live-eval.ts\n",
    );
    process.exit(1);
  }

  const datasetPath = join(__dirname, "dataset.json");
  const dataset: TestCase[] = JSON.parse(readFileSync(datasetPath, "utf-8"));

  console.log(`\n  Live Eval Runner`);
  console.log(`  ================`);
  console.log(`  Model: ${MODEL_ID}`);
  console.log(`  Dataset: ${dataset.length} test cases\n`);

  const results: LiveEvalResult[] = [];

  for (const testCase of dataset) {
    const startTime = Date.now();
    const result: LiveEvalResult = {
      id: testCase.id,
      input: testCase.input,
      expectedTool: testCase.expectedTool,
      actualTool: null,
      allToolCalls: [],
      toolSelectionPass: false,
      outputShapePass: true,
      missingFields: [],
      durationMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      error: null,
    };

    try {
      const response = await generateText({
        model: gateway(MODEL_ID),
        system: SYSTEM_PROMPT,
        tools: allTools,
        toolChoice: "required",
        prompt: testCase.input,
        stopWhen: stepCountIs(2),
        abortSignal: AbortSignal.timeout(15_000),
      });

      result.durationMs = Date.now() - startTime;
      result.inputTokens = response.usage.inputTokens ?? 0;
      result.outputTokens = response.usage.outputTokens ?? 0;
      result.cost = calculateCost(
        MODEL_ID,
        result.inputTokens,
        result.outputTokens,
      );

      // Check tool selection
      const toolCalls = response.steps.flatMap((step) =>
        step.toolCalls.map((tc) => tc.toolName),
      );
      result.allToolCalls = toolCalls;
      result.actualTool = toolCalls[0] ?? null;
      result.toolSelectionPass = toolCalls.includes(testCase.expectedTool);

      // Check output shape
      if (testCase.expectedFields && testCase.expectedFields.length > 0) {
        const toolResults = response.steps.flatMap((step) =>
          step.toolResults.map((tr) => tr.output),
        );

        if (toolResults.length > 0) {
          const output = toolResults[0] as Record<string, unknown>;
          for (const field of testCase.expectedFields) {
            if (
              output === undefined ||
              output === null ||
              !(field in output)
            ) {
              result.outputShapePass = false;
              result.missingFields.push(field);
            }
          }
        } else {
          // Client-side tools — check args
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
      result.durationMs = Date.now() - startTime;
      result.error = err instanceof Error ? err.message : String(err);
    }

    const status =
      result.toolSelectionPass && result.outputShapePass ? "PASS" : "FAIL";
    const icon = status === "PASS" ? "+" : "x";
    const toolInfo = result.actualTool
      ? `(called: ${result.actualTool})`
      : "(no tool called)";
    console.log(
      `  [${icon}] ${testCase.id}: ${status} ${toolInfo} [${result.durationMs}ms, $${result.cost.toFixed(6)}]`,
    );

    results.push(result);
  }

  // Aggregate
  const toolSelectionPasses = results.filter((r) => r.toolSelectionPass).length;
  const outputShapePasses = results.filter((r) => r.outputShapePass).length;
  const allPasses = results.filter(
    (r) => r.toolSelectionPass && r.outputShapePass,
  ).length;
  const totalCost = results.reduce((s, r) => s + r.cost, 0);
  const totalInputTokens = results.reduce((s, r) => s + r.inputTokens, 0);
  const totalOutputTokens = results.reduce((s, r) => s + r.outputTokens, 0);
  const avgDuration =
    results.reduce((s, r) => s + r.durationMs, 0) / results.length;

  const report: LiveEvalReport = {
    timestamp: new Date().toISOString(),
    mode: "live",
    modelId: MODEL_ID,
    totalCases: dataset.length,
    passed: allPasses,
    failed: dataset.length - allPasses,
    toolSelectionAccuracy: toolSelectionPasses / dataset.length,
    outputShapeAccuracy: outputShapePasses / dataset.length,
    totalCost,
    totalInputTokens,
    totalOutputTokens,
    avgDurationMs: Math.round(avgDuration),
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
  console.log(`  Total cost:          $${report.totalCost.toFixed(6)}`);
  console.log(
    `  Total tokens:        ${report.totalInputTokens}in / ${report.totalOutputTokens}out`,
  );
  console.log(`  Avg duration:        ${report.avgDurationMs}ms`);

  // Write JSON report
  const outputDir = join(__dirname, "..", ".evidence");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, "live-eval.json");
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n  Report: ${outputPath}\n`);

  if (report.failed > 0) {
    process.exit(1);
  }
}

runLiveEvals().catch((err) => {
  console.error("Live eval runner failed:", err);
  process.exit(1);
});
