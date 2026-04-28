#!/usr/bin/env tsx
/**
 * Run quality rubrics against mock tool outputs.
 *
 * For every tool in TOOL_RUBRICS (auto-generated from your tool metadata):
 *   1. Reads mock output (you provide a getMockToolOutput function)
 *   2. Evaluates each metric against the mock output
 *   3. Writes per-tool results to .evidence/rubrics/<tool>.json
 *   4. Writes a summary to .evidence/rubrics/_summary.json
 *
 * Metric methods supported offline (no API calls):
 *   - contract-check: checks for presence / shape / field count
 *   - regex:          evaluates regex against serialized output
 *   - exact-match:    exact string match
 *   - llm-judge:      skipped (logged as "requires API call")
 *   - manual:         skipped (logged as "requires human review")
 *
 * HOW TO CUSTOMIZE:
 * 1. Update imports to point to your generated rubrics + mock data
 * 2. Implement getMockToolOutput() for your tools
 * 3. Run: `pnpm rubrics:run`
 *
 * Copied from vercel-ai-starter-kit. Customize for your project.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// TODO: Update these imports for your project
// import { TOOL_META, type QualityMetric, type ToolMeta } from '../lib/ai/tools/_metadata';
// import { TOOL_RUBRICS } from '../lib/ai/tool-rubrics.generated';
// import { getMockToolOutput } from '../lib/registry/mock-tool-data';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = resolve(ROOT, '.evidence/rubrics');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QualityMetric {
  name: string;
  weight: number;
  threshold: number;
  method: 'contract-check' | 'regex' | 'exact-match' | 'llm-judge' | 'manual';
  criteria: string;
}

interface MetricResult {
  name: string;
  method: QualityMetric['method'];
  weight: number;
  threshold: number;
  score: number;
  passed: boolean;
  criteria: string;
  note?: string;
}

interface ToolRubricResult {
  tool: string;
  category: string;
  timestamp: string;
  hasMockOutput: boolean;
  totalMetrics: number;
  metricsPassed: number;
  metricsAutomated: number;
  metricsSkipped: number;
  overallScore: number;
  overallPassRate: number;
  metrics: MetricResult[];
}

// ---------------------------------------------------------------------------
// Metric evaluation helpers
// ---------------------------------------------------------------------------

function safeStringify(value: unknown): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value ?? '');
  } catch {
    return String(value);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getByPath(value: unknown, path: string): unknown {
  if (!path) return value;
  const parts = path.replace(/\[(\w+)\]/g, '.$1').split('.').filter(Boolean);
  let current: unknown = value;
  for (const part of parts) {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      const idx = Number(part);
      if (!Number.isNaN(idx)) { current = current[idx]; continue; }
      return undefined;
    }
    if (isPlainObject(current)) { current = current[part]; continue; }
    return undefined;
  }
  return current;
}

function runContractCheck(output: unknown, criterion: string): { score: number; note: string } {
  const rangeMatch = criterion.match(/^([\w.]+)\.length:(\d+)-(\d+)$/);
  if (rangeMatch) {
    const [, path, min, max] = rangeMatch;
    const val = getByPath(output, path);
    if (Array.isArray(val)) {
      const ok = val.length >= Number(min) && val.length <= Number(max);
      return { score: ok ? 1 : 0, note: `${path}.length=${val.length}` };
    }
    return { score: 0, note: `${path} is not an array` };
  }

  if (criterion === 'non-empty') {
    if (output == null) return { score: 0, note: 'output is null' };
    if (typeof output === 'string') return { score: output.length > 0 ? 1 : 0, note: `len=${output.length}` };
    if (Array.isArray(output)) return { score: output.length > 0 ? 1 : 0, note: `len=${output.length}` };
    if (isPlainObject(output)) return { score: Object.keys(output).length > 0 ? 1 : 0, note: `keys=${Object.keys(output).length}` };
    return { score: 1, note: 'truthy scalar' };
  }

  if (criterion === 'non-empty-array') {
    if (Array.isArray(output)) return { score: output.length > 0 ? 1 : 0, note: `len=${output.length}` };
    if (isPlainObject(output)) {
      for (const [k, v] of Object.entries(output)) {
        if (Array.isArray(v) && v.length > 0) return { score: 1, note: `${k}.length=${v.length}` };
      }
    }
    return { score: 0, note: 'no non-empty array found' };
  }

  if (criterion === 'is-object' || criterion === 'valid-shape' || criterion === 'has-object-shape') {
    return { score: isPlainObject(output) ? 1 : 0, note: isPlainObject(output) ? `keys=${Object.keys(output).length}` : 'not an object' };
  }

  if (criterion.includes('|')) {
    const fields = criterion.split('|').map(f => f.trim()).filter(Boolean);
    if (isPlainObject(output)) {
      const matched = fields.filter(f => output[f] !== undefined && output[f] !== null);
      return { score: matched.length > 0 ? 1 : 0, note: matched.length > 0 ? `matched: ${matched.join(', ')}` : `none of: ${fields.join(', ')}` };
    }
    return { score: 0, note: 'output not an object' };
  }

  if (criterion.includes('.') || criterion.includes('[')) {
    const val = getByPath(output, criterion);
    const present = val !== undefined && val !== null;
    return { score: present ? 1 : 0, note: `${criterion}=${present ? 'present' : 'missing'}` };
  }

  if (isPlainObject(output)) {
    const has = output[criterion] !== undefined && output[criterion] !== null;
    return { score: has ? 1 : 0, note: `${criterion}=${has ? 'present' : 'missing'}` };
  }

  return { score: 0, note: `output not an object; criterion="${criterion}"` };
}

function runRegexCheck(output: unknown, pattern: string): { score: number; note: string } {
  const serialized = safeStringify(output);
  try {
    const re = new RegExp(pattern);
    const ok = re.test(serialized);
    return { score: ok ? 1 : 0, note: ok ? 'matched' : 'no match' };
  } catch (err) {
    return { score: 0, note: `invalid regex: ${(err as Error).message}` };
  }
}

function runExactMatch(output: unknown, expected: string): { score: number; note: string } {
  const serialized = safeStringify(output);
  return { score: serialized === expected ? 1 : 0, note: serialized === expected ? 'exact match' : 'mismatch' };
}

function evaluateMetric(output: unknown, metric: QualityMetric): MetricResult {
  let score = 0;
  let note: string | undefined;
  let automated = true;

  switch (metric.method) {
    case 'contract-check': { const res = runContractCheck(output, metric.criteria); score = res.score; note = res.note; break; }
    case 'regex': { const res = runRegexCheck(output, metric.criteria); score = res.score; note = res.note; break; }
    case 'exact-match': { const res = runExactMatch(output, metric.criteria); score = res.score; note = res.note; break; }
    case 'llm-judge': { automated = false; note = 'requires API call (skipped in offline run)'; score = 0; break; }
    case 'manual': { automated = false; note = 'requires human review (skipped)'; score = 0; break; }
    default: { note = `unknown method: ${metric.method as string}`; score = 0; }
  }

  return {
    name: metric.name, method: metric.method, weight: metric.weight, threshold: metric.threshold,
    score, passed: automated ? score >= metric.threshold : false, criteria: metric.criteria, note,
  };
}

// ---------------------------------------------------------------------------
// Runner (stub -- wire up your imports above)
// ---------------------------------------------------------------------------

function run() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // TODO: Replace these with your actual imports
  const TOOL_RUBRICS: Record<string, QualityMetric[]> = {};
  const TOOL_META: Record<string, { category: string }> = {};
  const getMockToolOutput = (_toolName: string): unknown => undefined;

  const results: ToolRubricResult[] = [];
  const missingMock: string[] = [];

  for (const [toolName, rubric] of Object.entries(TOOL_RUBRICS)) {
    const meta = TOOL_META[toolName];
    if (!meta) continue;

    const mockOutput = getMockToolOutput(toolName);
    const hasMockOutput = mockOutput !== undefined;
    if (!hasMockOutput) missingMock.push(toolName);

    const metrics = rubric.map(m => evaluateMetric(mockOutput, m));
    const automatedMetrics = metrics.filter(m => m.method !== 'llm-judge' && m.method !== 'manual');
    const skippedMetrics = metrics.length - automatedMetrics.length;
    const metricsPassed = automatedMetrics.filter(m => m.passed).length;
    const automatedWeightSum = automatedMetrics.reduce((sum, m) => sum + m.weight, 0);
    const weightedScore = automatedWeightSum > 0 ? automatedMetrics.reduce((sum, m) => sum + m.score * m.weight, 0) / automatedWeightSum : 0;
    const overallPassRate = automatedMetrics.length > 0 ? metricsPassed / automatedMetrics.length : 0;

    const result: ToolRubricResult = {
      tool: toolName, category: meta.category, timestamp: new Date().toISOString(),
      hasMockOutput, totalMetrics: metrics.length, metricsPassed,
      metricsAutomated: automatedMetrics.length, metricsSkipped: skippedMetrics,
      overallScore: Number(weightedScore.toFixed(4)), overallPassRate: Number(overallPassRate.toFixed(4)),
      metrics,
    };
    results.push(result);
    writeFileSync(resolve(OUTPUT_DIR, `${toolName}.json`), JSON.stringify(result, null, 2), 'utf-8');
  }

  // Summary
  const withMock = results.filter(r => r.hasMockOutput);
  const avgPassRate = withMock.length > 0 ? withMock.reduce((sum, r) => sum + r.overallPassRate, 0) / withMock.length : 0;
  const avgScore = withMock.length > 0 ? withMock.reduce((sum, r) => sum + r.overallScore, 0) / withMock.length : 0;

  const summary = {
    timestamp: new Date().toISOString(),
    totalTools: results.length,
    toolsWithMocks: withMock.length,
    toolsWithoutMocks: missingMock.length,
    averagePassRate: Number(avgPassRate.toFixed(4)),
    averageScore: Number(avgScore.toFixed(4)),
    lowPerformers: withMock.filter(r => r.overallPassRate < 0.5).map(r => ({ tool: r.tool, category: r.category, overallPassRate: r.overallPassRate })),
    missingMock,
    tools: results.map(r => ({ tool: r.tool, category: r.category, hasMockOutput: r.hasMockOutput, totalMetrics: r.totalMetrics, metricsPassed: r.metricsPassed, metricsAutomated: r.metricsAutomated, metricsSkipped: r.metricsSkipped, overallScore: r.overallScore, overallPassRate: r.overallPassRate })),
  };

  writeFileSync(resolve(OUTPUT_DIR, '_summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`[rubrics:run] evaluated ${results.length} tools -- avg pass rate ${(avgPassRate * 100).toFixed(1)}%, results in ${OUTPUT_DIR}`);
}

run();
