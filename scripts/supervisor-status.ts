import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import {
  generateSupervisorManifest,
  SUPERVISOR_MANIFEST_FILE,
} from './ai-starter-core.js';

const state = generateSupervisorManifest();
const statePath = resolve(process.cwd(), SUPERVISOR_MANIFEST_FILE);
mkdirSync(dirname(statePath), { recursive: true });
writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf-8');

console.log(`backend=${state.backend}`);
console.log(`status=${state.status}`);
console.log(`state=${SUPERVISOR_MANIFEST_FILE}`);
for (const session of state.sessions) {
  console.log(`${session.name}\t${session.role}\t${session.observed ? 'observed' : 'missing'}`);
}
