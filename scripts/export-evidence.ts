#!/usr/bin/env tsx

import { execFileSync } from 'child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';
import { basename, join, resolve } from 'path';

interface ExportSummary {
  id: string;
  createdAt: string;
  archivePath: string;
  downloadPath: string;
  bytes: number;
  included: string[];
  excluded: string[];
  warnings: string[];
}

const cwd = process.cwd();
const exportDir = resolve(cwd, '.ai-starter/exports');
const latestPath = join(exportDir, 'latest.json');
const runRecordPath = resolve(cwd, '.ai-starter/runs/latest-evidence-export.json');

const requestedName = process.argv
  .slice(2)
  .find((arg) => arg.startsWith('--name='))
  ?.split('=')
  .slice(1)
  .join('=');

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function safeName(input?: string) {
  return (input ?? `ai-starter-evidence-${timestampSlug()}`)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || `ai-starter-evidence-${timestampSlug()}`;
}

function readJson<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function existing(paths: string[]) {
  return paths.filter((path) => existsSync(resolve(cwd, path)));
}

function main() {
  mkdirSync(exportDir, { recursive: true });
  mkdirSync(resolve(cwd, '.ai-starter/runs'), { recursive: true });

  const id = safeName(requestedName);
  const archivePath = join(exportDir, `${id}.tgz`);
  const includes = existing([
    '.ai-starter',
    '.evidence',
    '.expect/replays',
    'playwright-report',
    'test-results',
    'AGENTS.md',
    'CLAUDE.md',
    'DESIGN.md',
    'README.md',
    'package.json',
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'docs',
    'tests/expect',
  ]);

  if (includes.length === 0) {
    throw new Error('No starter evidence files found to export.');
  }

  const excluded = [
    '.env',
    '.env.*',
    'node_modules',
    '.next',
    '.git',
    '.ai-starter/exports',
    '*.pem',
    '*.key',
    '*secret*',
    '*token*',
  ];

  const warnings: string[] = [];
  const latestScorecard = readJson<{ blockers?: unknown[] }>(
    resolve(cwd, '.ai-starter/runs/latest-scorecard.json'),
    {},
  );
  if (Array.isArray(latestScorecard.blockers) && latestScorecard.blockers.length > 0) {
    warnings.push(`Latest scorecard has ${latestScorecard.blockers.length} blocker(s).`);
  }

  const commandArgs = [
    ...excluded.flatMap((pattern) => ['--exclude', pattern]),
    '-czf',
    archivePath,
    ...includes,
  ];

  execFileSync('tar', commandArgs, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const summary: ExportSummary = {
    id,
    createdAt: new Date().toISOString(),
    archivePath,
    downloadPath: '/api/control-plane/evidence-export',
    bytes: statSync(archivePath).size,
    included: includes,
    excluded,
    warnings,
  };

  writeFileSync(latestPath, JSON.stringify(summary, null, 2) + '\n', 'utf-8');
  writeFileSync(runRecordPath, JSON.stringify(summary, null, 2) + '\n', 'utf-8');

  console.log(`evidence-export=success`);
  console.log(`archive=${archivePath}`);
  console.log(`download=${summary.downloadPath}`);
  console.log(`bytes=${summary.bytes}`);
  console.log(`included=${includes.length}`);
  if (warnings.length > 0) console.log(`warnings=${warnings.join('; ')}`);
  console.log(`filename=${basename(archivePath)}`);
}

main();
