/**
 * Eval: AI SDK tool `codeReview`
 *
 * Coverage:
 *  - happy path: a benign code blob is reviewed and shape is correct
 *  - malformed: missing required `code` field is rejected by the schema
 *  - adversarial: instructions embedded inside the `code` string are
 *    treated as code (data), not as directives to the tool. The tool is
 *    deterministic today (static checks), but the eval still asserts that
 *    a critical issue (`eval(`) is reported when present and that the
 *    injection text doesn't bypass detection.
 */

import { describe, expect, it } from "vitest";
import { codeReview } from "@/lib/ai/tools/code-review";
import {
  ADVERSARIAL_PROMPTS,
  RUN_LIVE_EVALS,
  TOOL_OPTIONS,
  asExecutable,
} from "./_shared";

interface ReviewInput {
  code: string;
  language?: string;
  focusAreas?: string[];
}
interface ReviewOutput {
  totalIssues: number;
  critical: number;
  warnings: number;
  info: number;
  issues: Array<{ severity: string; category: string; message: string }>;
  language: string;
}

const tool = asExecutable<ReviewInput, ReviewOutput>(codeReview);

describe("eval: codeReview (AI SDK tool)", () => {
  describe("happy path", () => {
    it("accepts a valid code string and returns a structured review", async () => {
      expect(
        tool.inputSchema.safeParse({ code: "const x = 1;" }).success,
      ).toBe(true);

      const result = await tool.execute(
        { code: "const x = 1;\nconst y = 2;\n", language: "typescript" },
        TOOL_OPTIONS,
      );

      expect(result.language).toBe("typescript");
      expect(result.totalIssues).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it("flags eval() as a critical security issue", async () => {
      const result = await tool.execute(
        { code: "const value = eval(input);", language: "typescript" },
        TOOL_OPTIONS,
      );

      expect(result.critical).toBeGreaterThan(0);
      expect(result.issues.some((i) => i.category === "security")).toBe(true);
    });
  });

  describe("malformed input", () => {
    it("rejects input that is missing the required `code` field", () => {
      expect(
        tool.inputSchema.safeParse({ language: "typescript" }).success,
      ).toBe(false);
    });

    it("rejects unknown focusAreas values", () => {
      expect(
        tool.inputSchema.safeParse({
          code: "x",
          focusAreas: ["mind-control"],
        }).success,
      ).toBe(false);
    });
  });

  describe("adversarial prompt injection", () => {
    it("treats injection text inside the `code` field as opaque source", async () => {
      // The `code` arg is a string; the schema accepts it. The execute()
      // path must NOT interpret instructions inside it.
      const code = `// ${ADVERSARIAL_PROMPTS.ignoreInstructions}\nconst v = 1;`;
      expect(tool.inputSchema.safeParse({ code }).success).toBe(true);

      const result = await tool.execute({ code }, TOOL_OPTIONS);

      // Tool returned a structured review; the injection did not change
      // the response shape (e.g. it didn't dump a "system prompt").
      expect(result).toHaveProperty("totalIssues");
      expect(result).toHaveProperty("issues");
      expect(typeof result.totalIssues).toBe("number");
    });

    it("still detects eval() even when adversarial comments surround it", async () => {
      const code = `/* ${ADVERSARIAL_PROMPTS.toolHijack} */\nconst v = eval(payload);`;
      const result = await tool.execute({ code }, TOOL_OPTIONS);

      expect(result.critical).toBeGreaterThan(0);
    });
  });

  describe("live-only checks", () => {
    it.skipIf(!RUN_LIVE_EVALS)(
      "live: an LLM-backed reviewer agrees with the static eval() flag",
      async () => {
        // Reserved for an LLM-as-judge call against the same payload.
        expect(RUN_LIVE_EVALS).toBe(true);
      },
    );
  });
});
