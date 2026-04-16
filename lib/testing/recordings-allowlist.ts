/**
 * Allowlisted directories for test recordings (security helper).
 *
 * Both listing and streaming routes import from here to keep the
 * surface area minimal. Only files inside these roots can be served.
 *
 * HOW TO CUSTOMIZE:
 * 1. Update ALLOWED_ROOTS with your evidence directories
 * 2. Update ROOT_KEYS for your naming convention
 * 3. Add/remove EXTENSION_KIND entries as needed
 *
 * Copied from vercel-ai-dev-kit. Customize for your project.
 */

import path from 'node:path';

export const ALLOWED_ROOTS: readonly string[] = [
  path.resolve(process.cwd(), '.evidence', 'videos'),
  path.resolve(process.cwd(), '.evidence', 'mobile'),
  path.resolve(process.cwd(), '.evidence', 'rubrics'),
  path.resolve(process.cwd(), 'test-results'),
  path.resolve(process.cwd(), 'playwright-report', 'data'),
];

export const ROOT_KEYS = {
  EVIDENCE_VIDEOS: 'evidence-videos',
  EVIDENCE_MOBILE: 'evidence-mobile',
  EVIDENCE_RUBRICS: 'evidence-rubrics',
  TEST_RESULTS: 'test-results',
  PLAYWRIGHT_REPORT: 'playwright-report',
} as const;

export type RootKey = (typeof ROOT_KEYS)[keyof typeof ROOT_KEYS];

export const ROOT_BY_KEY: Record<RootKey, string> = {
  [ROOT_KEYS.EVIDENCE_VIDEOS]: path.resolve(process.cwd(), '.evidence', 'videos'),
  [ROOT_KEYS.EVIDENCE_MOBILE]: path.resolve(process.cwd(), '.evidence', 'mobile'),
  [ROOT_KEYS.EVIDENCE_RUBRICS]: path.resolve(process.cwd(), '.evidence', 'rubrics'),
  [ROOT_KEYS.TEST_RESULTS]: path.resolve(process.cwd(), 'test-results'),
  [ROOT_KEYS.PLAYWRIGHT_REPORT]: path.resolve(process.cwd(), 'playwright-report', 'data'),
};

export function rootKeyFor(absoluteRoot: string): RootKey | null {
  const entries = Object.entries(ROOT_BY_KEY) as Array<[RootKey, string]>;
  const match = entries.find(([, root]) => root === absoluteRoot);
  return match ? match[0] : null;
}

export type RecordingKind = 'video' | 'image' | 'trace';

export const EXTENSION_KIND: Record<string, RecordingKind> = {
  '.webm': 'video', '.mp4': 'video', '.mov': 'video',
  '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.webp': 'image', '.gif': 'image',
  '.zip': 'trace',
};

export function kindForExtension(ext: string): RecordingKind | null {
  return EXTENSION_KIND[ext.toLowerCase()] ?? null;
}

export const CONTENT_TYPE: Record<string, string> = {
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.mov': 'video/quicktime',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.zip': 'application/zip',
};

export function resolveSafePath(requested: string): string | null {
  if (typeof requested !== 'string' || requested.length === 0) return null;
  if (/[\0\n\r]/.test(requested)) return null;
  const absolute = path.resolve(process.cwd(), requested);
  const contained = ALLOWED_ROOTS.some((root) => {
    const withSep = root.endsWith(path.sep) ? root : root + path.sep;
    return absolute === root || absolute.startsWith(withSep);
  });
  if (!contained) return null;
  const ext = path.extname(absolute).toLowerCase();
  if (!(ext in EXTENSION_KIND)) return null;
  return absolute;
}

export function deriveFeature(absolute: string, root: string, rootKey: RootKey): string {
  const rel = path.relative(root, absolute);
  const segments = rel.split(path.sep).filter(Boolean);
  if (segments.length <= 1) {
    if (rootKey === ROOT_KEYS.EVIDENCE_MOBILE) return 'mobile';
    if (rootKey === ROOT_KEYS.EVIDENCE_RUBRICS) return 'rubrics';
    if (rootKey === ROOT_KEYS.TEST_RESULTS) return 'playwright';
    return 'custom';
  }
  return segments[0];
}
