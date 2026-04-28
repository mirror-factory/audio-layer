#!/usr/bin/env tsx

import {
  formatSyncSummary,
  syncStarterSystem,
  generateScorecard,
} from './ai-starter-core.js';

const cwd = process.cwd();
const sync = syncStarterSystem({ cwd });
const scorecard = generateScorecard({ cwd });

console.log(`Starter sync complete: ${formatSyncSummary(sync)}`);
console.log(`Scorecard: ${scorecard.score}/100`);
if (scorecard.blockers.length > 0) {
  console.log(`Blockers: ${scorecard.blockers.join('; ')}`);
}
