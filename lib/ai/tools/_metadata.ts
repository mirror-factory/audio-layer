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
  // Search / Knowledge
  {
    name: 'search_docs',
    category: 'search',
    service: 'supabase',
    access: 'read',
    description: 'Full-text search across the knowledge base via hybrid vector and BM25 ranking, returning ranked document excerpts with relevance scores',
    permissionTier: 'explorer',
    version: '1.0.0',
    costEstimate: 'free',
    testStatus: 'passing',
  },
  {
    name: 'get_document',
    category: 'knowledge',
    service: 'supabase',
    access: 'read',
    description: 'Fetch a complete document by its unique identifier, returning the full content with metadata and revision history',
    permissionTier: 'explorer',
    version: '1.0.0',
    costEstimate: 'free',
    testStatus: 'passing',
  },

  // Code
  {
    name: 'code_review',
    category: 'code',
    service: 'local',
    access: 'read',
    description: 'Analyze source code for quality issues, security vulnerabilities, and adherence to best practices with severity-ranked feedback',
    permissionTier: 'explorer',
    version: '1.0.0',
    costEstimate: '$0.001',
    testStatus: 'passing',
  },

  // Generation
  {
    name: 'generate_content',
    category: 'generation',
    service: 'ai-gateway',
    access: 'write',
    description: 'Generate text content from a prompt and optional template, supporting multiple output formats and style configurations',
    permissionTier: 'executor',
    version: '1.0.0',
    costEstimate: '$0.01-0.05',
    testStatus: 'passing',
  },

  // Interview / Client-Side
  {
    name: 'ask_user',
    category: 'interview',
    service: 'client',
    access: 'client-side',
    description: 'Present an interactive question with selectable options to the user and wait for their selection before continuing',
    clientSide: true,
    permissionTier: 'explorer',
    version: '1.0.0',
    costEstimate: 'free',
    testStatus: 'passing',
  },

  // Config
  {
    name: 'update_settings',
    category: 'config',
    service: 'supabase',
    access: 'write',
    description: 'Update project configuration values in the database, validating against the schema before persisting changes',
    permissionTier: 'executor',
    version: '1.0.0',
    costEstimate: 'free',
    testStatus: 'untested',
  },
];

/** O(1) lookup by tool name */
export const TOOL_METADATA_MAP = Object.fromEntries(
  TOOL_METADATA.map((t) => [t.name, t])
);
