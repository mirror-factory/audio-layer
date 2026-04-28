#!/usr/bin/env tsx

import {
  createPlan,
  formatSyncSummary,
  syncStarterSystem,
  summarizePlan,
} from './ai-starter-core.js';

function promptFromArgs(args: string[]): string {
  return args[0] === '--' ? args.slice(1).join(' ').trim() : args.join(' ').trim();
}

const prompt = promptFromArgs(process.argv.slice(2));

if (!prompt) {
  console.error('Usage: tsx scripts/plan-task.ts "<task description>"');
  process.exit(1);
}

const cwd = process.cwd();
const sync = syncStarterSystem({ cwd });
const plan = createPlan({ cwd }, prompt);

console.log(`Starter sync complete: ${formatSyncSummary(sync)}`);
console.log(`Plan created: ${summarizePlan(plan)}`);
console.log(`Plan ID: ${plan.id}`);
