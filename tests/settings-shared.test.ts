import { describe, it, expect } from "vitest";
import { DEFAULTS, MODEL_OPTIONS } from "@/lib/settings-shared";

describe("DEFAULTS", () => {
  it("has correct summaryModel", () => {
    expect(DEFAULTS.summaryModel).toBe("openai/gpt-5.4-nano");
  });

  it("has correct batchSpeechModel", () => {
    expect(DEFAULTS.batchSpeechModel).toBe("universal-2");
  });

  it("has correct streamingSpeechModel", () => {
    expect(DEFAULTS.streamingSpeechModel).toBe("universal-streaming-multilingual");
  });
});

describe("MODEL_OPTIONS", () => {
  it("has current summary model options from the LLM pricing catalog", () => {
    expect(MODEL_OPTIONS.summary).toHaveLength(13);
  });

  it("has AssemblyAI batch speech models that are implemented at runtime", () => {
    expect(MODEL_OPTIONS.batchSpeech).toHaveLength(2);
  });

  it("has AssemblyAI streaming speech models that are implemented at runtime", () => {
    expect(MODEL_OPTIONS.streamingSpeech).toHaveLength(4);
  });

  it("every summary option has value, label, and price", () => {
    for (const opt of MODEL_OPTIONS.summary) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
      expect(opt.price).toBeTruthy();
    }
  });

  it("every batch speech option has value, label, and price", () => {
    for (const opt of MODEL_OPTIONS.batchSpeech) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
      expect(opt.price).toBeTruthy();
    }
  });

  it("every streaming speech option has value, label, and price", () => {
    for (const opt of MODEL_OPTIONS.streamingSpeech) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
      expect(opt.price).toBeTruthy();
    }
  });

  it("summary options include common providers", () => {
    const values = MODEL_OPTIONS.summary.map((o) => o.value);
    // Verify options span multiple providers
    expect(values.some((v) => v.startsWith("anthropic/"))).toBe(true);
    expect(values.some((v) => v.startsWith("openai/"))).toBe(true);
    expect(values.some((v) => v.startsWith("google/"))).toBe(true);
  });

  it("default batchSpeechModel exists in batch speech options", () => {
    const values = MODEL_OPTIONS.batchSpeech.map((o) => o.value);
    expect(values).toContain(DEFAULTS.batchSpeechModel);
  });

  it("default streamingSpeechModel exists in streaming speech options", () => {
    const values = MODEL_OPTIONS.streamingSpeech.map((o) => o.value);
    expect(values).toContain(DEFAULTS.streamingSpeechModel);
  });
});
