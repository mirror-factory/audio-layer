import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getBatchSpeechModels } from "@/lib/assemblyai/client";

describe("getBatchSpeechModels", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.ASSEMBLYAI_BATCH_MODEL;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ASSEMBLYAI_BATCH_MODEL;
    } else {
      process.env.ASSEMBLYAI_BATCH_MODEL = originalEnv;
    }
  });

  it("returns an array", () => {
    const result = getBatchSpeechModels();
    expect(Array.isArray(result)).toBe(true);
  });

  it('maps "best" to ["universal-3-pro"]', () => {
    const result = getBatchSpeechModels("best");
    expect(result).toEqual(["universal-3-pro"]);
  });

  it("passes through an explicit model as a single-element array", () => {
    const result = getBatchSpeechModels("nano");
    expect(result).toEqual(["nano"]);
  });

  it("defaults to universal-3-pro when no override or env", () => {
    delete process.env.ASSEMBLYAI_BATCH_MODEL;
    const result = getBatchSpeechModels();
    expect(result).toEqual(["universal-3-pro"]);
  });

  it("reads from ASSEMBLYAI_BATCH_MODEL env when no override", () => {
    process.env.ASSEMBLYAI_BATCH_MODEL = "slam-1";
    const result = getBatchSpeechModels();
    expect(result).toEqual(["slam-1"]);
  });
});
