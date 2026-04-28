import { generateCompanionSkeletons } from './ai-starter-core.js';

const result = generateCompanionSkeletons({ cwd: process.cwd() });

console.log(`created=${result.created.length}`);
console.log(`skipped=${result.skipped.length}`);
for (const file of result.created) {
  console.log(file);
}
