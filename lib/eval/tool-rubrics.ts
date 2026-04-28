/**
 * Default quality rubrics by tool category.
 *
 * HOW TO CUSTOMIZE:
 * 1. Replace ToolCategory with your project's categories (defined in _metadata.ts)
 * 2. Add/remove rubric sets to match your tool types
 * 3. Each metric has: name, weight (0-1), threshold (0-1), method, criteria
 *
 * Methods:
 *   - 'contract-check': Checks for presence / shape / field count in output
 *   - 'regex':          Evaluates a regex against the serialized output
 *   - 'exact-match':    Exact string match
 *   - 'llm-judge':      AI-powered evaluation (requires API call, skipped in offline runs)
 *   - 'manual':         Human review required (always skipped in automated runs)
 *
 * Copied from vercel-ai-starter-kit. Customize for your project.
 */

// TODO: Import your project's ToolCategory and ToolMeta types
// import type { QualityMetric, ToolCategory, ToolMeta } from '@/lib/ai/tools/_metadata';

// ---------------------------------------------------------------------------
// Types (inline until you wire up your own _metadata.ts)
// ---------------------------------------------------------------------------

export interface QualityMetric {
  name: string;
  weight: number;
  threshold: number;
  method: 'contract-check' | 'regex' | 'exact-match' | 'llm-judge' | 'manual';
  criteria: string;
}

export type ToolCategory =
  | 'interview'
  | 'update'
  | 'generation'
  | 'analysis'
  | 'editing'
  | 'search';

export interface ToolMeta {
  category: ToolCategory;
  qualityRubric?: QualityMetric[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Category defaults
// ---------------------------------------------------------------------------

const INTERVIEW_RUBRIC: QualityMetric[] = [
  {
    name: 'Returns a valid question string',
    weight: 0.4,
    threshold: 0.9,
    method: 'contract-check',
    criteria: 'question',
  },
  {
    name: 'Options are appropriate count (2-6)',
    weight: 0.3,
    threshold: 1,
    method: 'contract-check',
    criteria: 'options.length:2-6',
  },
  {
    name: 'Question is clear (not empty, > 5 chars)',
    weight: 0.3,
    threshold: 1,
    method: 'regex',
    criteria: '^.{6,}$',
  },
];

const UPDATE_RUBRIC: QualityMetric[] = [
  {
    name: 'Updates target field',
    weight: 0.4,
    threshold: 1,
    method: 'contract-check',
    criteria: 'updates|success|updated',
  },
  {
    name: 'Preserves other fields (non-destructive shape)',
    weight: 0.3,
    threshold: 0.9,
    method: 'contract-check',
    criteria: 'has-object-shape',
  },
  {
    name: 'Data types match schema',
    weight: 0.3,
    threshold: 1,
    method: 'contract-check',
    criteria: 'valid-shape',
  },
];

const GENERATION_IMAGE_RUBRIC: QualityMetric[] = [
  {
    name: 'Returns image URL or base64',
    weight: 0.35,
    threshold: 1,
    method: 'contract-check',
    criteria: 'images|dataUrl|url|svg',
  },
  {
    name: 'Image is generated, not placeholder',
    weight: 0.2,
    threshold: 0.8,
    method: 'regex',
    criteria: '(?!.*placeholder).*',
  },
  {
    name: 'Matches intent',
    weight: 0.45,
    threshold: 0.7,
    method: 'llm-judge',
    criteria:
      'Judge whether the generated output matches the user intent described in the tool input. Score 0-1.',
  },
];

const GENERATION_COMPONENT_RUBRIC: QualityMetric[] = [
  {
    name: 'Returns valid HTML',
    weight: 0.2,
    threshold: 1,
    method: 'regex',
    criteria: '<[a-zA-Z][\\s\\S]*>',
  },
  {
    name: 'Has Tailwind classes',
    weight: 0.15,
    threshold: 0.8,
    method: 'regex',
    criteria: 'class(Name)?="[^"]*(flex|grid|text-|bg-|p[xy]?-|m[xy]?-|w-|h-)',
  },
  {
    name: 'Is responsive (has breakpoint classes)',
    weight: 0.15,
    threshold: 0.8,
    method: 'regex',
    criteria: '(sm:|md:|lg:|xl:)',
  },
  {
    name: 'Has no inline styles',
    weight: 0.15,
    threshold: 0.9,
    method: 'regex',
    criteria: '^(?!.*style=).*$',
  },
  {
    name: 'Matches intent',
    weight: 0.35,
    threshold: 0.7,
    method: 'llm-judge',
    criteria:
      'Judge whether the generated component matches the user intent in the tool input. Score 0-1.',
  },
];

const GENERATION_GENERIC_RUBRIC: QualityMetric[] = [
  {
    name: 'Returns non-empty output',
    weight: 0.5,
    threshold: 1,
    method: 'contract-check',
    criteria: 'non-empty',
  },
  {
    name: 'Matches intent',
    weight: 0.5,
    threshold: 0.7,
    method: 'llm-judge',
    criteria:
      'Judge whether the generated output matches the tool input intent. Score 0-1.',
  },
];

const ANALYSIS_RUBRIC: QualityMetric[] = [
  {
    name: 'Returns structured data',
    weight: 0.35,
    threshold: 1,
    method: 'contract-check',
    criteria: 'is-object',
  },
  {
    name: 'Contains required fields',
    weight: 0.35,
    threshold: 0.9,
    method: 'contract-check',
    criteria: 'non-empty',
  },
  {
    name: 'Data is actionable',
    weight: 0.3,
    threshold: 0.7,
    method: 'llm-judge',
    criteria:
      'Judge whether the analysis provides actionable, specific insights (not generic). Score 0-1.',
  },
];

const EDITING_RUBRIC: QualityMetric[] = [
  {
    name: 'Preserves unchanged content',
    weight: 0.4,
    threshold: 0.9,
    method: 'llm-judge',
    criteria:
      'Judge whether the edit preserves content that was not requested to change. Score 0-1.',
  },
  {
    name: 'Applies only requested change',
    weight: 0.3,
    threshold: 0.9,
    method: 'llm-judge',
    criteria:
      'Judge whether the edit applies only the changes that were requested. Score 0-1.',
  },
  {
    name: 'No syntax errors in output',
    weight: 0.3,
    threshold: 1,
    method: 'contract-check',
    criteria: 'non-empty',
  },
];

const SEARCH_RUBRIC: QualityMetric[] = [
  {
    name: 'Returns results array',
    weight: 0.4,
    threshold: 1,
    method: 'contract-check',
    criteria: 'results|images|components|matches|items',
  },
  {
    name: 'Results have required fields',
    weight: 0.3,
    threshold: 0.9,
    method: 'contract-check',
    criteria: 'non-empty-array',
  },
  {
    name: 'Results are relevant',
    weight: 0.3,
    threshold: 0.7,
    method: 'llm-judge',
    criteria:
      'Judge whether search results are relevant to the query in the tool input. Score 0-1.',
  },
];

// ---------------------------------------------------------------------------
// Default rubrics by category
// ---------------------------------------------------------------------------

export const DEFAULT_RUBRICS: Record<ToolCategory, QualityMetric[]> = {
  interview: INTERVIEW_RUBRIC,
  update: UPDATE_RUBRIC,
  generation: GENERATION_GENERIC_RUBRIC,
  analysis: ANALYSIS_RUBRIC,
  editing: EDITING_RUBRIC,
  search: SEARCH_RUBRIC,
};

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/**
 * Resolve the default rubric for a tool. Uses per-tool override if present,
 * then looks at tool name to pick the best generation variant,
 * then falls back to the category default.
 */
export function resolveDefaultRubric(
  toolName: string,
  meta: ToolMeta,
): QualityMetric[] {
  // Respect per-tool override
  if (meta.qualityRubric && meta.qualityRubric.length > 0) {
    return meta.qualityRubric;
  }

  // Search tools -> SEARCH_RUBRIC regardless of category
  if (/^search|^browse|^lookup/i.test(toolName)) {
    return SEARCH_RUBRIC;
  }

  // Generation category — split image vs component vs generic
  // TODO: Customize these regex patterns for your tool names
  if (meta.category === 'generation') {
    const isImage = /image|logo|svg|photo|asset|icon|pattern/i.test(toolName);
    const isComponent = /frame|component|template|section/i.test(toolName);
    if (isImage) return GENERATION_IMAGE_RUBRIC;
    if (isComponent) return GENERATION_COMPONENT_RUBRIC;
    return GENERATION_GENERIC_RUBRIC;
  }

  return DEFAULT_RUBRICS[meta.category] ?? GENERATION_GENERIC_RUBRIC;
}

// Re-export per-variant rubrics for direct reuse
export {
  INTERVIEW_RUBRIC,
  UPDATE_RUBRIC,
  GENERATION_IMAGE_RUBRIC,
  GENERATION_COMPONENT_RUBRIC,
  GENERATION_GENERIC_RUBRIC,
  ANALYSIS_RUBRIC,
  EDITING_RUBRIC,
  SEARCH_RUBRIC,
};
