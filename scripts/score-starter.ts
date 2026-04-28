#!/usr/bin/env tsx

import { formatSyncSummary, generateScorecard, syncStarterSystem } from './ai-starter-core.js';

const cwd = process.cwd();
const sync = syncStarterSystem({ cwd });
const scorecard = generateScorecard({ cwd });

console.log(`Starter sync complete: ${formatSyncSummary(sync)}`);
console.log(`Score: ${scorecard.score}/100`);
console.log(`Blockers: ${scorecard.blockers.length > 0 ? scorecard.blockers.join('; ') : 'none'}`);
console.log(
  `Recommendations: ${
    scorecard.recommendations.length > 0
      ? scorecard.recommendations.join('; ')
      : 'none'
  }`,
);
