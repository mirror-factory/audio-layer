#!/usr/bin/env node

/**
 * Auto-version script — bumps patch version and updates CHANGELOG.md.
 *
 * Called from .husky/post-commit hook.
 * Creates a separate follow-up commit (not --amend) to avoid hook loops
 * and preserve the original commit integrity.
 *
 * Usage: node scripts/auto-version.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

// 1. Read current version
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);
const newVersion = `${major}.${minor}.${patch + 1}`;

// 2. Update package.json
pkg.version = newVersion;
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

// 3. Get the commit message and hash
const commitMsg = execSync("git log -1 --pretty=%s").toString().trim();
const commitHash = execSync("git log -1 --pretty=%h").toString().trim();
const date = new Date().toISOString().split("T")[0];

// 4. Categorize the commit
const category = commitMsg.startsWith("fix:")
  ? "Fixed"
  : commitMsg.startsWith("feat:")
    ? "Added"
    : commitMsg.startsWith("test:")
      ? "Testing"
      : commitMsg.startsWith("docs:")
        ? "Documentation"
        : commitMsg.startsWith("refactor:")
          ? "Changed"
          : "Other";

// 5. Update CHANGELOG.md
const changelogPath = "CHANGELOG.md";
let changelog = "";
try {
  changelog = readFileSync(changelogPath, "utf8");
} catch {
  /* new file */
}

const entry = `## [${newVersion}] — ${date}

### ${category}
- ${commitMsg} (\`${commitHash}\`)

`;

// Insert after the header (or at top if no header)
const headerEnd = changelog.indexOf("\n---\n");
if (headerEnd > -1) {
  changelog =
    changelog.slice(0, headerEnd + 5) +
    "\n" +
    entry +
    changelog.slice(headerEnd + 5);
} else {
  changelog = `# Changelog\n\nAll notable changes. Format: [Keep a Changelog](https://keepachangelog.com/)\n\n---\n\n${entry}${changelog}`;
}

writeFileSync(changelogPath, changelog);

// 6. Create a separate commit for the version bump (NOT --amend)
// Using --amend --no-verify in a post-commit hook is fragile:
// - It rewrites history that may already be referenced
// - --no-verify skips pre-commit checks on the amended content
// - It can cause infinite hook loops in some git versions
// Instead, create a clean follow-up commit.
execSync("git add package.json CHANGELOG.md");
execSync(`git commit --no-verify -m "chore: bump to ${newVersion}"`);

console.log(`Version bumped to ${newVersion}`);
