/**
 * Tool Quality Checker Script
 *
 * Loads all tool metadata from the registry, runs a description scorer
 * on each tool, and prints a graded report.
 *
 * Exits with code 1 if any tool receives grade F.
 * Used by the pre-commit hook.
 *
 * Usage:
 *   npx tsx scripts/check-tool-quality.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ToolMetadata {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface ScoreResult {
  name: string;
  score: number;
  grade: string;
  issues: string[];
}

const REGISTRY_PATHS = [
  join(process.cwd(), '.registry', 'tools.json'),
  join(process.cwd(), 'templates', '_registry.ts'),
  join(process.cwd(), 'lib', 'tool-registry.ts'),
  join(process.cwd(), 'tool-registry.ts'),
];

function loadTools(): ToolMetadata[] {
  // Try JSON registry
  const jsonPath = REGISTRY_PATHS.find(
    (p) => p.endsWith('.json') && existsSync(p)
  );

  if (jsonPath) {
    try {
      const content = readFileSync(jsonPath, 'utf-8');
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : data.tools || [];
    } catch {
      // Fall through
    }
  }

  // Try TypeScript registries -- basic extraction
  for (const registryPath of REGISTRY_PATHS) {
    if (registryPath.endsWith('.ts') && existsSync(registryPath)) {
      try {
        const content = readFileSync(registryPath, 'utf-8');
        const tools: ToolMetadata[] = [];

        const nameMatches = content.matchAll(
          /name:\s*['"]([^'"]+)['"]/g
        );
        const descMatches = content.matchAll(
          /description:\s*['"]([^'"]+)['"]/g
        );

        const names = Array.from(nameMatches).map((m) => m[1]);
        const descs = Array.from(descMatches).map((m) => m[1]);

        for (let i = 0; i < names.length; i++) {
          tools.push({
            name: names[i],
            description: descs[i] || undefined,
          });
        }

        if (tools.length > 0) return tools;
      } catch {
        // Fall through
      }
    }
  }

  return [];
}

function scoreTool(tool: ToolMetadata): ScoreResult {
  const issues: string[] = [];
  let score = 100;

  const desc = tool.description || '';

  // --- Description checks ---

  // Missing description
  if (!desc) {
    issues.push('Missing description');
    score -= 50;
  } else {
    // Too short (less than 10 chars)
    if (desc.length < 10) {
      issues.push(`Description too short (${desc.length} chars, minimum 10)`);
      score -= 30;
    }

    // Too long (more than 200 chars)
    if (desc.length > 200) {
      issues.push(`Description too long (${desc.length} chars, maximum 200)`);
      score -= 10;
    }

    // Does not start with a verb
    const startsWithVerb = /^[A-Z][a-z]+s?\s/.test(desc) || /^[a-z]+s?\s/.test(desc);
    if (!startsWithVerb) {
      issues.push('Description should start with an action verb (e.g., "Fetches...", "Creates...")');
      score -= 10;
    }

    // Contains vague words
    const vagueWords = ['stuff', 'things', 'misc', 'various', 'etc'];
    const lowerDesc = desc.toLowerCase();
    for (const word of vagueWords) {
      if (lowerDesc.includes(word)) {
        issues.push(`Description contains vague word: "${word}"`);
        score -= 5;
      }
    }

    // No period at the end
    if (!desc.endsWith('.')) {
      issues.push('Description should end with a period');
      score -= 5;
    }
  }

  // --- Name checks ---

  // Name should use kebab-case or camelCase
  if (tool.name.includes(' ')) {
    issues.push('Tool name should not contain spaces');
    score -= 15;
  }

  // Name too short
  if (tool.name.length < 3) {
    issues.push('Tool name is too short (minimum 3 characters)');
    score -= 10;
  }

  // --- Schema checks ---
  if (tool.inputSchema) {
    const schema = tool.inputSchema;
    if (!schema.type) {
      issues.push('inputSchema missing "type" field');
      score -= 10;
    }
    if (schema.type === 'object' && !schema.properties) {
      issues.push('inputSchema with type "object" should have "properties"');
      score -= 10;
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Assign grade
  let grade: string;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  return { name: tool.name, score, grade, issues };
}

function printReport(results: ScoreResult[]): void {
  const width = 60;
  const divider = '-'.repeat(width);

  console.log('');
  console.log(divider);
  console.log('  TOOL QUALITY REPORT');
  console.log(divider);
  console.log('');

  for (const result of results) {
    const gradeColor =
      result.grade === 'A'
        ? '\x1b[32m'  // green
        : result.grade === 'B'
          ? '\x1b[32m'  // green
          : result.grade === 'C'
            ? '\x1b[33m'  // yellow
            : result.grade === 'D'
              ? '\x1b[33m'  // yellow
              : '\x1b[31m'; // red
    const reset = '\x1b[0m';

    console.log(
      `  ${gradeColor}[${result.grade}]${reset} ${result.name} (score: ${result.score}/100)`
    );

    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        console.log(`      - ${issue}`);
      }
    }
  }

  console.log('');
  console.log(divider);

  const grades = results.reduce(
    (acc, r) => {
      acc[r.grade] = (acc[r.grade] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log('  Summary:');
  console.log(`    Total tools: ${results.length}`);
  for (const g of ['A', 'B', 'C', 'D', 'F']) {
    if (grades[g]) {
      console.log(`    Grade ${g}: ${grades[g]}`);
    }
  }

  const avgScore =
    results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
      : 0;
  console.log(`    Average score: ${avgScore}/100`);
  console.log(divider);
  console.log('');
}

function main(): void {
  const tools = loadTools();

  if (tools.length === 0) {
    console.log('No tools found in registry. Nothing to check.');
    process.exit(0);
  }

  const results = tools.map(scoreTool);

  printReport(results);

  const failures = results.filter((r) => r.grade === 'F');
  if (failures.length > 0) {
    console.log(
      `\x1b[31m[FAIL]\x1b[0m ${failures.length} tool(s) received grade F. Fix quality issues before committing.\n`
    );
    for (const f of failures) {
      console.log(`  - ${f.name}`);
    }
    console.log('');
    process.exit(1);
  }

  console.log('\x1b[32m[PASS]\x1b[0m All tools meet minimum quality standards.\n');
}

main();
