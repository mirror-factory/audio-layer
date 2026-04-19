/**
 * Sample tool: code-review
 *
 * Demonstrates AI Dev Kit tool patterns:
 * - Zod inputSchema (not parameters)
 * - Quality description (50+ chars, action verb, what/when/accepts/returns)
 * - Permission tier assignment
 * - Proper execute function with typed input
 *
 * Created by: ai-dev-kit init
 */

import { tool } from 'ai';
import { z } from 'zod';

export const codeReview = tool({
  description: 'Analyze source code for quality issues, security vulnerabilities, and adherence to best practices. Accepts a code string and optional language hint, returns structured feedback with severity levels and suggested fixes.',
  inputSchema: z.object({
    code: z.string().describe('The source code to review'),
    language: z.string().optional().describe('Programming language hint (e.g., typescript, python)'),
    focusAreas: z.array(z.enum(['security', 'performance', 'readability', 'testing', 'accessibility'])).optional().describe('Specific areas to focus the review on'),
  }),
  execute: async ({ code, language, focusAreas }) => {
    // In production, this would call an LLM or static analysis tool
    const issues: Array<{
      severity: 'critical' | 'warning' | 'info';
      category: string;
      message: string;
      line?: number;
      suggestion?: string;
    }> = [];

    // Basic static checks (example)
    if (code.includes('eval(')) {
      issues.push({
        severity: 'critical',
        category: 'security',
        message: 'Use of eval() detected -- potential code injection vulnerability',
        suggestion: 'Replace eval() with a safer alternative like JSON.parse() for data or a sandboxed interpreter for code execution',
      });
    }

    if (code.includes('any')) {
      issues.push({
        severity: 'warning',
        category: 'readability',
        message: 'TypeScript "any" type detected -- reduces type safety',
        suggestion: 'Replace with specific types or use "unknown" with type guards',
      });
    }

    if (code.length > 500 && !code.includes('//') && !code.includes('/*')) {
      issues.push({
        severity: 'info',
        category: 'readability',
        message: 'No comments found in a substantial code block',
        suggestion: 'Add comments to explain complex logic or non-obvious decisions',
      });
    }

    return {
      totalIssues: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
      issues,
      language: language ?? 'unknown',
      focusAreas: focusAreas ?? ['security', 'performance', 'readability'],
      reviewedAt: new Date().toISOString(),
    };
  },
});
