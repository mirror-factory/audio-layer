#!/usr/bin/env tsx
/**
 * Evidence Bundle Generator — Collects verification artifacts from a run.
 *
 * Run: `tsx scripts/generate-evidence.ts`
 *
 * Steps:
 *   1. Creates .evidence/ directory
 *   2. Runs each verification gate and captures output
 *   3. Generates .evidence/bundle.json summary
 *   4. Prints formatted report to stdout
 *
 * Gates:
 *   - build: Next.js build
 *   - typecheck: TypeScript --noEmit
 *   - tests: Vitest run
 *   - smoke: Basic validation (file structure, imports)
 *   - telemetry-scan: Verify telemetry is wired into AI calls
 *   - docs-freshness: Check key docs exist and are recent
 */

import { execSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  statSync,
  readdirSync,
} from "fs";
import { join, resolve } from "path";

// ── Types ─────────────────────────────────────────────────────────────

interface GateResult {
  name: string;
  pass: boolean;
  artifact: string;
  duration: number;
  error?: string;
}

interface EvidenceBundle {
  timestamp: string;
  version: string;
  gates: {
    name: string;
    pass: boolean;
    artifact: string;
    duration: number;
  }[];
  summary: {
    totalGates: number;
    passed: number;
    failed: number;
    unverified: string[];
  };
  telemetry?: {
    totalCalls: number;
    totalCost: number;
    avgTTFT: number;
    models: string[];
  };
}

// ── Config ────────────────────────────────────────────────────────────

const ROOT = resolve(__dirname, "..");
const REF_APP = join(ROOT, "reference-app");
const EVIDENCE_DIR = join(ROOT, ".evidence");
const VERSION = JSON.parse(
  readFileSync(join(REF_APP, "package.json"), "utf-8"),
).version;

// ── Helpers ───────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function runCommand(
  cmd: string,
  cwd: string,
  timeoutMs = 120_000,
): { stdout: string; success: boolean; durationMs: number } {
  const start = Date.now();
  try {
    const stdout = execSync(cmd, {
      cwd,
      timeout: timeoutMs,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    return { stdout, success: true, durationMs: Date.now() - start };
  } catch (err: unknown) {
    const execErr = err as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    const output = [
      execErr.stdout ?? "",
      execErr.stderr ?? "",
      execErr.message ?? "",
    ].join("\n");
    return { stdout: output, success: false, durationMs: Date.now() - start };
  }
}

function writeArtifact(filename: string, content: string): string {
  const path = join(EVIDENCE_DIR, filename);
  writeFileSync(path, content);
  return filename;
}

// ── Gates ─────────────────────────────────────────────────────────────

function runBuildGate(): GateResult {
  console.log("  Running build...");
  const result = runCommand("npx next build", REF_APP, 180_000);
  const artifact = writeArtifact("build.log", result.stdout);
  return {
    name: "build",
    pass: result.success,
    artifact,
    duration: result.durationMs,
  };
}

function runTypecheckGate(): GateResult {
  console.log("  Running typecheck...");
  const result = runCommand("npx tsc --noEmit", REF_APP);
  const artifact = writeArtifact("typecheck.log", result.stdout);
  return {
    name: "typecheck",
    pass: result.success,
    artifact,
    duration: result.durationMs,
  };
}

function runTestsGate(): GateResult {
  console.log("  Running tests...");
  const result = runCommand("npx vitest run --reporter=json 2>&1", REF_APP);

  // Try to parse JSON test results
  let testSummary: Record<string, unknown> = {};
  try {
    // vitest JSON output may have leading text, find the JSON part
    const jsonMatch = result.stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
    if (jsonMatch) {
      testSummary = JSON.parse(jsonMatch[0]);
    }
  } catch {
    testSummary = { raw: result.stdout.slice(0, 2000) };
  }

  const artifact = writeArtifact(
    "test-results.json",
    JSON.stringify(testSummary, null, 2),
  );
  return {
    name: "tests",
    pass: result.success,
    artifact,
    duration: result.durationMs,
  };
}

function runSmokeGate(): GateResult {
  console.log("  Running smoke validation...");
  const start = Date.now();
  const checks: string[] = [];
  let allPass = true;

  // Check critical files exist
  const criticalFiles = [
    "app/api/chat/route.ts",
    "lib/ai/tools.ts",
    "lib/ai/telemetry.ts",
    "app/page.tsx",
    "package.json",
    "tsconfig.json",
  ];

  for (const file of criticalFiles) {
    const exists = existsSync(join(REF_APP, file));
    checks.push(`${exists ? "PASS" : "FAIL"}: ${file} exists`);
    if (!exists) allPass = false;
  }

  // Check telemetry is imported in route
  const routeContent = existsSync(join(REF_APP, "app/api/chat/route.ts"))
    ? readFileSync(join(REF_APP, "app/api/chat/route.ts"), "utf-8")
    : "";

  const hasTelemetryImport = routeContent.includes("telemetry");
  checks.push(
    `${hasTelemetryImport ? "PASS" : "FAIL"}: route.ts imports telemetry`,
  );
  if (!hasTelemetryImport) allPass = false;

  const hasExperimentalTelemetry = routeContent.includes(
    "experimental_telemetry",
  );
  checks.push(
    `${hasExperimentalTelemetry ? "PASS" : "FAIL"}: route.ts has experimental_telemetry`,
  );
  if (!hasExperimentalTelemetry) allPass = false;

  // Check evals directory
  const hasEvals = existsSync(join(REF_APP, "evals/dataset.json"));
  checks.push(`${hasEvals ? "PASS" : "FAIL"}: evals/dataset.json exists`);
  if (!hasEvals) allPass = false;

  const artifact = writeArtifact("smoke.log", checks.join("\n"));
  return {
    name: "smoke",
    pass: allPass,
    artifact,
    duration: Date.now() - start,
  };
}

function runTelemetryScanGate(): GateResult {
  console.log("  Running telemetry scan...");
  const start = Date.now();

  const telemetryFile = join(REF_APP, "lib/ai/telemetry.ts");
  const routeFile = join(REF_APP, "app/api/chat/route.ts");

  const scan: Record<string, unknown> = {
    telemetryFileExists: existsSync(telemetryFile),
    routeFileExists: existsSync(routeFile),
    exports: [],
    routeUsage: [],
  };

  if (existsSync(telemetryFile)) {
    const content = readFileSync(telemetryFile, "utf-8");
    const exports: string[] = [];
    if (content.includes("export function withTelemetry"))
      exports.push("withTelemetry");
    if (content.includes("export function logAICall")) exports.push("logAICall");
    if (content.includes("export function logError")) exports.push("logError");
    if (content.includes("export const telemetryConfig"))
      exports.push("telemetryConfig");
    if (content.includes("export function getLogs")) exports.push("getLogs");
    if (content.includes("export function getStats")) exports.push("getStats");
    if (content.includes("export function getErrors"))
      exports.push("getErrors");
    scan.exports = exports;

    // Check required fields in AILogRecord
    const requiredFields = [
      "traceId",
      "userId",
      "sessionId",
      "chatId",
      "modelId",
      "provider",
      "inputTokens",
      "outputTokens",
      "cost",
      "durationMs",
      "ttftMs",
      "toolCalls",
      "finishReason",
      "error",
    ];
    const presentFields = requiredFields.filter((f) => content.includes(f));
    const missingFields = requiredFields.filter((f) => !content.includes(f));
    scan.requiredFieldsPresent = presentFields;
    scan.requiredFieldsMissing = missingFields;
  }

  if (existsSync(routeFile)) {
    const content = readFileSync(routeFile, "utf-8");
    const usages: string[] = [];
    if (content.includes("withTelemetry")) usages.push("withTelemetry");
    if (content.includes("logAICall")) usages.push("logAICall");
    if (content.includes("logError")) usages.push("logError");
    if (content.includes("experimental_telemetry"))
      usages.push("experimental_telemetry");
    if (content.includes("onFinish")) usages.push("onFinish callback");
    if (content.includes("onError")) usages.push("onError callback");
    if (content.includes("ttftMs") || content.includes("firstTokenTime"))
      usages.push("TTFT tracking");
    if (content.includes("toolCalls") || content.includes("toolCallNames"))
      usages.push("tool call tracking");
    scan.routeUsage = usages;
  }

  const allFieldsPresent =
    ((scan.requiredFieldsMissing as string[]) ?? []).length === 0;
  const hasRequiredExports =
    (scan.exports as string[]).includes("withTelemetry") &&
    (scan.exports as string[]).includes("logAICall") &&
    (scan.exports as string[]).includes("logError");
  const routeWired = ((scan.routeUsage as string[]) ?? []).length >= 4;

  const pass = allFieldsPresent && hasRequiredExports && routeWired;

  const artifact = writeArtifact(
    "telemetry-scan.json",
    JSON.stringify(scan, null, 2),
  );
  return {
    name: "telemetry-scan",
    pass,
    artifact,
    duration: Date.now() - start,
  };
}

function runDocsFreshnessGate(): GateResult {
  console.log("  Running docs freshness check...");
  const start = Date.now();

  const docsToCheck = [
    { path: "CLAUDE.md", maxAgeDays: 30 },
    { path: "reference-app/package.json", maxAgeDays: 30 },
  ];

  const results: Record<string, unknown>[] = [];
  let allFresh = true;

  for (const doc of docsToCheck) {
    const fullPath = join(ROOT, doc.path);
    if (!existsSync(fullPath)) {
      results.push({
        path: doc.path,
        exists: false,
        fresh: false,
      });
      allFresh = false;
      continue;
    }

    const stat = statSync(fullPath);
    const ageMs = Date.now() - stat.mtimeMs;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const fresh = ageDays <= doc.maxAgeDays;

    results.push({
      path: doc.path,
      exists: true,
      lastModified: stat.mtime.toISOString(),
      ageDays: Math.round(ageDays),
      maxAgeDays: doc.maxAgeDays,
      fresh,
    });

    if (!fresh) allFresh = false;
  }

  const artifact = writeArtifact(
    "docs-freshness.json",
    JSON.stringify(results, null, 2),
  );
  return {
    name: "docs-freshness",
    pass: allFresh,
    artifact,
    duration: Date.now() - start,
  };
}

// ── Telemetry Collection ──────────────────────────────────────────────

function collectTelemetry(): EvidenceBundle["telemetry"] | undefined {
  // Check for eval results that might have telemetry data
  const evalResultsPath = join(REF_APP, ".evidence", "live-eval.json");
  if (existsSync(evalResultsPath)) {
    try {
      const data = JSON.parse(readFileSync(evalResultsPath, "utf-8"));
      return {
        totalCalls: data.totalCases ?? 0,
        totalCost: data.totalCost ?? 0,
        avgTTFT: data.avgDurationMs ?? 0,
        models: data.modelId ? [data.modelId] : [],
      };
    } catch {
      // Ignore parse errors
    }
  }
  return undefined;
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  console.log("\n  Evidence Bundle Generator");
  console.log("  ========================\n");

  ensureDir(EVIDENCE_DIR);

  // Run all gates
  const gates: GateResult[] = [];
  const unverified: string[] = [];

  // Always run these
  gates.push(runSmokeGate());
  gates.push(runTelemetryScanGate());
  gates.push(runDocsFreshnessGate());

  // Typecheck (should always be available)
  try {
    gates.push(runTypecheckGate());
  } catch {
    unverified.push("typecheck");
  }

  // Tests
  try {
    gates.push(runTestsGate());
  } catch {
    unverified.push("tests");
  }

  // Build (expensive, run last)
  try {
    gates.push(runBuildGate());
  } catch {
    unverified.push("build");
  }

  // Collect telemetry if available
  const telemetry = collectTelemetry();

  // Build bundle
  const passed = gates.filter((g) => g.pass).length;
  const failed = gates.filter((g) => !g.pass).length;

  const bundle: EvidenceBundle = {
    timestamp: new Date().toISOString(),
    version: VERSION,
    gates: gates.map((g) => ({
      name: g.name,
      pass: g.pass,
      artifact: g.artifact,
      duration: g.duration,
    })),
    summary: {
      totalGates: gates.length + unverified.length,
      passed,
      failed,
      unverified,
    },
    telemetry,
  };

  // Write bundle
  writeArtifact("bundle.json", JSON.stringify(bundle, null, 2));

  // Print report
  console.log("\n  ──────────────────────────────────────");
  console.log("  Evidence Bundle Report");
  console.log("  ──────────────────────────────────────\n");
  console.log(`  Version:     ${bundle.version}`);
  console.log(`  Timestamp:   ${bundle.timestamp}`);
  console.log(`  Gates:       ${passed}/${gates.length + unverified.length} passed\n`);

  for (const gate of gates) {
    const icon = gate.pass ? "+" : "x";
    const duration = `${(gate.duration / 1000).toFixed(1)}s`;
    console.log(
      `  [${icon}] ${gate.name.padEnd(20)} ${gate.pass ? "PASS" : "FAIL"}  (${duration})  -> ${gate.artifact}`,
    );
  }

  for (const name of unverified) {
    console.log(`  [?] ${name.padEnd(20)} UNVERIFIED`);
  }

  if (telemetry) {
    console.log(`\n  Telemetry`);
    console.log(`  ---------`);
    console.log(`  Total calls:   ${telemetry.totalCalls}`);
    console.log(`  Total cost:    $${telemetry.totalCost.toFixed(6)}`);
    console.log(`  Avg TTFT:      ${telemetry.avgTTFT}ms`);
    console.log(`  Models:        ${telemetry.models.join(", ")}`);
  }

  console.log(`\n  Artifacts: ${EVIDENCE_DIR}/`);
  console.log(`  Bundle:    ${EVIDENCE_DIR}/bundle.json\n`);

  if (failed > 0) {
    console.log(`  WARNING: ${failed} gate(s) failed.\n`);
    process.exit(1);
  }

  if (unverified.length > 0) {
    console.log(
      `  NOTE: ${unverified.length} gate(s) could not be verified.\n`,
    );
  }
}

main();
