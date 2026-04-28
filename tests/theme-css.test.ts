import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("generated design token CSS", () => {
  it("does not include YAML inline comments in custom property values", () => {
    const css = readFileSync(join(process.cwd(), "app/styles/tokens.css"), "utf-8");

    expect(css).toContain("--neutral-950: #0a0a0a;");
    expect(css).toContain("--brand-accent-subtle: #0d9488;");
    expect(css).not.toContain("# page background");
    expect(css).not.toMatch(/--[a-z0-9-]+:\s*[^;]*"\s*#/);
  });
});
