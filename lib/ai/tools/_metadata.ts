/**
 * Tool metadata registry -- single source of truth for all AI tools.
 *
 * Every tool your chat agent can call should have an entry here.
 * Derived registries, documentation generation, enforcement tests,
 * and the AGENTS.md compressed index all consume this array.
 *
 * To add a tool:
 * 1. Add an entry here
 * 2. Define the tool with `tool()` in your tools file
 * 3. Run `ai-dev-kit tool validate` to check quality
 * 4. Run `pnpm test` -- registry sync test catches missing entries
 */

import type { ToolMetadata } from './_types';

export const TOOL_METADATA: ToolMetadata[] = [
  {
    name: 'searchMeetings',
    category: 'search',
    service: 'supabase',
    access: 'read',
    description: 'Search meeting transcripts, summaries, and intake forms with semantic search and return ranked excerpts for chat grounding',
    permissionTier: 'explorer',
    version: '1.0.0',
    costEstimate: 'free',
    testStatus: 'passing',
  },
  {
    name: 'getMeetingDetails',
    category: 'knowledge',
    service: 'supabase',
    access: 'read',
    description: 'Fetch a single meeting by ID and return transcript, summary, action items, decisions, participants, and status context',
    permissionTier: 'explorer',
    version: '1.0.0',
    costEstimate: 'free',
    testStatus: 'passing',
  },
  {
    name: 'listRecentMeetings',
    category: 'knowledge',
    service: 'supabase',
    access: 'read',
    description: 'List recent meetings with titles, dates, durations, and processing status so chat can orient the user quickly',
    permissionTier: 'explorer',
    version: '1.0.0',
    costEstimate: 'free',
    testStatus: 'passing',
  },
  {
    name: 'codeReview',
    category: 'code',
    service: 'local',
    access: 'read',
    description: 'Analyze source code for quality issues, security vulnerabilities, readability, testing, and performance risks',
    permissionTier: 'explorer',
    version: '1.0.0',
    costEstimate: '$0.001',
    testStatus: 'passing',
  },
];

/** O(1) lookup by tool name */
export const TOOL_METADATA_MAP = Object.fromEntries(
  TOOL_METADATA.map((t) => [t.name, t])
);
