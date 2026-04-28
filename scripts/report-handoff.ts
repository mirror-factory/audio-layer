#!/usr/bin/env tsx

import {
  createReport,
  formatSyncSummary,
  generateScorecard,
  syncStarterSystem,
} from './ai-starter-core.js';

const cwd = process.cwd();
const sync = syncStarterSystem({ cwd });
generateScorecard({ cwd });
const report = createReport({ cwd });

console.log(`Starter sync complete: ${formatSyncSummary(sync)}`);
console.log(report);
